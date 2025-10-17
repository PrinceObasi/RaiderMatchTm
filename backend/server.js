/**
 * RaiderMatch Job Enricher (Node/Express)
 *
 * ENV:
 *   PORT=8080
 *   SUPABASE_URL=...
 *   SUPABASE_SERVICE_ROLE=...
 *   ENRICH_SHARED_SECRET=choose-a-long-random-string
 *   USE_PLAYWRIGHT=true           # optional, enables headless fallback
 */

const express = require('express');
const axios = require('axios').default;
const cheerio = require('cheerio');
const pLimit = require('p-limit');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json({ limit: '1mb' }));

// ---------- Supabase ----------
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE,
  { auth: { persistSession: false } }
);

// ---------- Security ----------
const SHARED_SECRET = process.env.ENRICH_SHARED_SECRET || "";

function requireSecret(req, res, next) {
  if (!SHARED_SECRET) return next(); // allow local dev
  const got = req.headers['x-raider-secret'];
  if (got !== SHARED_SECRET) return res.status(401).json({ error: 'unauthorized' });
  next();
}

// ---------- Helpers ----------
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36';

async function httpGet(url) {
  const res = await axios.get(url, {
    headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' },
    maxRedirects: 5,
    timeout: 20000,
    validateStatus: s => s >= 200 && s < 400
  });
  return typeof res.data === 'string' ? res.data : '';
}

async function browserGet(url) {
  if (!/^true$/i.test(String(process.env.USE_PLAYWRIGHT || ''))) return null;
  let chromium;
  try {
    chromium = require('playwright-core').chromium;
  } catch (_) {
    return null;
  }
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  try {
    const ctx = await browser.newContext({ userAgent: UA });
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2500);
    const html = await page.content();
    return html || null;
  } finally {
    await browser.close();
  }
}

function htmlToTextPreserveLists($root) {
  let text = $root
    .clone()
    .find('script,style,noscript,iframe,svg')
    .remove()
    .end()
    .text();
  text = text.replace(/\r/g, '');
  text = text.replace(/\n[ \t]+/g, '\n');
  text = text.replace(/[ \t]+\n/g, '\n');
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.replace(/[ \t]{2,}/g, ' ');
  return text.trim();
}

// ---------- ATS-specific extractors ----------
function pickDescriptionNode($, url) {
  const host = new URL(url).hostname;

  if (/greenhouse\.io$/.test(host) || /boards\.greenhouse\.io$/.test(host)) {
    return $('#content, .content, .main, .opening, .opening .content, .application').first();
  }
  if (/jobs\.lever\.co$/.test(host)) {
    return $('.posting, .section.page-centered, .content, .posting-description').first();
  }
  if (/workday|myworkdayjobs\.com/.test(host)) {
    return $('[data-automation-id="jobPostingDescription"], [data-automation-id="sections"], main, [role="main"]').first();
  }
  if (/taleo\.net$/.test(host) || /oracle\.com$/.test(host)) {
    return $('#requisitionDescriptionInterface, #description, main, [role="main"]').first();
  }
  if (/smartrecruiters\.com$/.test(host)) {
    return $('#job-details, .job-sections, main, [role="main"]').first();
  }
  if (/ashbyhq\.com$/.test(host)) {
    return $('[data-testid="JobPosting__JobDescription"], main, [role="main"]').first();
  }
  if (/jobvite\.com$/.test(host)) {
    return ($('div.jv-job-detail, #content, main, [role="main"]')).first();
  }
  const candidates = [
    'article',
    'main',
    '[role="main"]',
    '.job, .job__description, .job-description, .description, .posting-body, .content, .section',
    '#content'
  ].join(',');
  return $(candidates).first();
}

function extractDescription(html, url) {
  const $ = cheerio.load(html, { decodeEntities: true });
  $('header, footer, nav').remove();
  const node = pickDescriptionNode($, url);
  const text = htmlToTextPreserveLists(node && node.length ? node : $.root());
  const cleaned = text.replace(/\u00A0/g, ' ').trim();
  return cleaned;
}

// ---------- Tech stack mining ----------
const TECH_CANON = [
  'Python','Java','C','C++','C#','Go','Golang','Rust','Ruby','JavaScript','TypeScript','Kotlin','Swift','PHP','R','Scala',
  'React','Vue','Angular','Svelte','Next.js','Nuxt','Node.js','Express','Django','Flask','Spring','Spring Boot','.NET','ASP.NET',
  'AWS','Azure','GCP','Google Cloud','Cloud Run','Lambda','EC2','S3','DynamoDB','CloudFormation','Terraform','Kubernetes','Docker',
  'SQL','PostgreSQL','MySQL','MongoDB','Redis','Elasticsearch','Kafka','Spark','Hadoop','Snowflake','Databricks',
  'Jest','JUnit','PyTest','Playwright','Cypress','Selenium','Git','CI/CD','GitHub Actions','CircleCI',
  'PyTorch','TensorFlow','Scikit-learn','NumPy','Pandas',
  'React Native','SwiftUI','Android','iOS'
];

const TECH_ALIAS = new Map([
  ['Typescript','TypeScript'], ['Javascript','JavaScript'], ['Node','Node.js'],
  ['Google Cloud Platform','GCP'], ['Amazon Web Services','AWS'], ['MS Azure','Azure'],
  ['K8s','Kubernetes'], ['Postgres','PostgreSQL']
]);

function mineTechStack(description) {
  const text = ` ${description} `.toLowerCase();
  const found = new Set();
  for (const t of TECH_CANON) {
    const needle = t.toLowerCase();
    if (text.includes(` ${needle} `) || text.includes(`${needle},`) || text.includes(`${needle}.`) || text.includes(`(${needle})`)) {
      found.add(TECH_ALIAS.get(t) || t);
    }
  }
  for (const [alias, canon] of TECH_ALIAS.entries()) {
    if (text.includes(` ${alias.toLowerCase()} `)) found.add(canon);
  }
  return Array.from(found).sort();
}

// ---------- Core enrichment ----------
async function fetchDescription(url) {
  try {
    const html = await httpGet(url);
    const desc = extractDescription(html, url);
    if (desc && desc.length > 700) return desc;

    const html2 = await browserGet(url);
    if (html2) {
      const desc2 = extractDescription(html2, url);
      if (desc2 && desc2.length > 400) return desc2;
    }
    return (desc && desc.length > 120) ? desc : '';
  } catch (e) {
    return '';
  }
}

async function enrichOneRow(row) {
  const url = row.application_link || row.source_url;
  if (!url) return { id: row.id, ok: false, reason: 'no_url' };

  const description = await fetchDescription(url);
  if (!description) return { id: row.id, ok: false, reason: 'no_description' };

  const tech_stack = mineTechStack(description);
  const trimmed = description.length > 14000 ? description.slice(0, 14000) : description;

  const { error } = await supabase
    .from('internships')
    .update({ summary_text: trimmed, tech_stack })
    .eq('id', row.id);

  if (error) return { id: row.id, ok: false, reason: error.message };
  return { id: row.id, ok: true, tech_stack_count: tech_stack.length, chars: trimmed.length };
}

// ---------- API ----------
app.get('/extract', requireSecret, async (req, res) => {
  const url = String(req.query.url || '');
  if (!url) return res.status(400).json({ error: 'missing url' });
  const description = await fetchDescription(url);
  return res.json({ description, tech_stack: mineTechStack(description) });
});

app.post('/enrichBatch', requireSecret, async (req, res) => {
  const limitN = Number(req.body.limit || 40);
  const { data, error } = await supabase
    .from('internships')
    .select('id, company, role_title, application_link, source_url')
    .is('summary_text', null)
    .limit(limitN);

  if (error) return res.status(500).json({ error: error.message });
  if (!data || data.length === 0) return res.json({ success: true, processed: 0, results: [] });

  const limit = pLimit(4);
  const results = await Promise.all(data.map(row => limit(() => enrichOneRow(row))));
  const ok = results.filter(r => r.ok).length;
  res.json({ success: true, processed: data.length, updated: ok, results });
});

app.get('/', (_, res) => res.send('RaiderMatch Enricher up.'));

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`Enricher listening on :${port}`));
