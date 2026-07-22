// auto-sync-simplify v7 — authenticated sync with direct background enrichment dispatch
// Source A: SimplifyJobs Summer2026 (HTML <tr> tables, winding down)
// Source B: vanshb03 Summer2027 community repo (markdown pipe tables, ramping up)
// FIXES vs v5: 🛂 semantics corrected (🛂 = does NOT sponsor → visa 'No', was wrongly 'Yes');
// 🇺🇸 → us_citizen_required; 🔒 closed roles skipped; real posting dates from 2027 source.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.1";
import {
  isServiceRoleRequest,
  serviceRoleHeaders,
} from "../_shared/service-role.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MAX_ENRICHMENT_DISPATCH = 15;
const MIN_SAFE_LISTINGS_PER_SOURCE = 5;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const SOURCES = [
  {
    name: "simplify_2026",
    urls: [
      "https://raw.githubusercontent.com/SimplifyJobs/Summer2026-Internships/dev/README.md",
    ],
    format: "html" as const,
    source_url: "https://github.com/SimplifyJobs/Summer2026-Internships",
  },
  {
    name: "community_2027",
    urls: [
      "https://raw.githubusercontent.com/vanshb03/Summer2027-Internships/dev/README.md",
      "https://raw.githubusercontent.com/vanshb03/Summer2027-Internships/main/README.md",
    ],
    format: "markdown" as const,
    source_url: "https://github.com/vanshb03/Summer2027-Internships",
  },
];

const NON_SWE_KEYWORDS = [
  "product manager",
  "product management",
  "product intern",
  "data scientist",
  "data science intern",
  "data analyst",
  "quantitative researcher",
  "quant researcher",
  "quantitative analyst",
  "quantitative trader",
  "trading analyst",
  "trader intern",
  "hardware engineer",
  "electrical engineer",
  "firmware engineer",
  "analog engineer",
  "rf engineer",
  "mechanical engineer",
];

const SWE_KEYWORDS = [
  "software engineer",
  "software engineering",
  "software developer",
  "swe",
  "full stack",
  "full-stack",
  "frontend engineer",
  "front end engineer",
  "backend engineer",
  "back end engineer",
  "web engineer",
  "mobile engineer",
  "ios engineer",
  "android engineer",
  "platform engineer",
  "infrastructure engineer",
  "devops engineer",
  "site reliability",
  "sre",
  "ml engineer",
  "machine learning engineer",
];

const TEXAS_KEYWORDS = [
  "TX",
  "Texas",
  "Austin",
  "Houston",
  "Dallas",
  "San Antonio",
  "Fort Worth",
  "Plano",
  "Irving",
  "Lubbock",
];

const US_STATE_ABBREVS = new Set([
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
  "DC",
  "PR",
  "GU",
  "VI",
]);

const INTERNATIONAL_PATTERNS = [
  ", UK",
  ", Canada",
  ", CA, Canada",
  ", ON, Canada",
  ", BC, Canada",
  ", Germany",
  ", France",
  ", Ireland",
  ", Israel",
  ", India",
  ", Japan",
  ", Singapore",
  ", Australia",
  ", Netherlands",
  ", Sweden",
  ", Switzerland",
  ", Spain",
  ", Italy",
  ", Belgium",
  ", Poland",
  ", Czech",
  ", Austria",
  ", Denmark",
  ", Norway",
  ", Finland",
  ", Brazil",
  ", Mexico",
  ", Korea",
  ", China",
  ", Taiwan",
  ", Hong Kong",
  "London,",
  "Toronto,",
  "Vancouver,",
  "Montreal,",
  "Dublin,",
  "Berlin,",
  "Munich,",
  "Tel Aviv,",
  "Bangalore,",
  "Hyderabad,",
  "Tokyo,",
  "Sydney,",
  "Melbourne,",
  "Belfast,",
  "Edinburgh,",
  "Glasgow,",
  "Cardiff,",
  "Amsterdam,",
  "Waterloo, ON",
  "Mississauga",
  "Ottawa,",
  "Calgary,",
  ", ON</",
  ", BC</",
];

function isUSLocation(location: string): boolean {
  if (!location) return false;
  const loc = location.trim();
  if (
    /\bUSA\b/i.test(loc) || /\bUnited States\b/i.test(loc) ||
    /\bRemote in USA\b/i.test(loc) || /^Remote$/i.test(loc)
  ) return true;
  for (const pattern of INTERNATIONAL_PATTERNS) {
    if (loc.includes(pattern)) return false;
  }
  const stateMatches = loc.match(/\b([A-Z]{2})\b/g);
  if (stateMatches) {
    for (const abbr of stateMatches) {
      if (US_STATE_ABBREVS.has(abbr)) return true;
    }
  }
  const stateNames = [
    "Alabama",
    "Alaska",
    "Arizona",
    "Arkansas",
    "California",
    "Colorado",
    "Connecticut",
    "Delaware",
    "Florida",
    "Georgia",
    "Hawaii",
    "Idaho",
    "Illinois",
    "Indiana",
    "Iowa",
    "Kansas",
    "Kentucky",
    "Louisiana",
    "Maine",
    "Maryland",
    "Massachusetts",
    "Michigan",
    "Minnesota",
    "Mississippi",
    "Missouri",
    "Montana",
    "Nebraska",
    "Nevada",
    "New Hampshire",
    "New Jersey",
    "New Mexico",
    "New York",
    "North Carolina",
    "North Dakota",
    "Ohio",
    "Oklahoma",
    "Oregon",
    "Pennsylvania",
    "Rhode Island",
    "South Carolina",
    "South Dakota",
    "Tennessee",
    "Texas",
    "Utah",
    "Vermont",
    "Virginia",
    "Washington",
    "West Virginia",
    "Wisconsin",
    "Wyoming",
  ];
  for (const name of stateNames) if (loc.includes(name)) return true;
  const usCityShorthands = [
    "NYC",
    "SF",
    "LA",
    "DMV",
    "Bay Area",
    "Silicon Valley",
  ];
  for (const city of usCityShorthands) if (loc.includes(city)) return true;
  return false;
}

function detectAts(url: string): string | null {
  const map: Record<string, string> = {
    "greenhouse.io": "greenhouse",
    "lever.co": "lever",
    "myworkdayjobs.com": "workday",
    "jobvite.com": "jobvite",
    "icims.com": "icims",
    "smartrecruiters.com": "smartrecruiters",
    "ashbyhq.com": "ashby",
    "breezy.hr": "breezy",
    "recruitee.com": "recruitee",
    "workable.com": "workable",
  };
  for (const [domain, ats] of Object.entries(map)) {
    if (url.includes(domain)) return ats;
  }
  return null;
}

function fingerprint(company: string, role: string): string {
  return `${(company ?? "").toLowerCase().trim()}::${
    (role ?? "").toLowerCase().trim().substring(0, 30)
  }`;
}

function cleanUrl(url: string): string {
  try {
    const u = new URL(url);
    u.searchParams.delete("utm_source");
    u.searchParams.delete("utm_medium");
    u.searchParams.delete("utm_campaign");
    return u.toString();
  } catch {
    return url;
  }
}

async function fetchTextWithTimeout(url: string, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    return response.ok ? await response.text() : "";
  } finally {
    clearTimeout(timer);
  }
}

interface ParsedInternship {
  company: string;
  role_title: string;
  location: string;
  application_link: string;
  visa_sponsorship: "Yes" | "No" | "Unspecified";
  us_citizen_required: boolean;
  date_posted: string | null;
  source_url: string;
  fp: string;
}

function roleFilter(roleText: string): "swe" | "non_swe" {
  const titleLower = roleText.toLowerCase();
  const isNonSwe = NON_SWE_KEYWORDS.some((kw) => titleLower.includes(kw));
  const hasSweKeyword = SWE_KEYWORDS.some((kw) => titleLower.includes(kw));
  return (isNonSwe || !hasSweKeyword) ? "non_swe" : "swe";
}

// ── Parser A: SimplifyJobs HTML <tr> format ──
function parseHtmlFormat(markdown: string, sourceUrl: string) {
  const possibleStarts = [
    "## 💻 Software Engineering Internship Roles",
    "## Software Engineering Internship Roles",
    "💻 Software Engineering",
    "## 💻 Software Engineering",
  ];
  const possibleEnds = [
    "## 📱 Product Management Internship Roles",
    "## Product Management Internship Roles",
    "📱 Product Management",
    "## 📱 Product Management",
  ];
  let startIdx = -1;
  for (const marker of possibleStarts) {
    startIdx = markdown.indexOf(marker);
    if (startIdx !== -1) break;
  }
  let endIdx = -1;
  for (const marker of possibleEnds) {
    endIdx = markdown.indexOf(marker, startIdx + 1);
    if (endIdx !== -1) break;
  }
  let sweOnly = markdown;
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    sweOnly = markdown.slice(startIdx, endIdx);
  }

  const rows = sweOnly.split("<tr>").slice(1);
  const internships: ParsedInternship[] = [];
  let skippedNonSwe = 0,
    skippedAdvancedDegree = 0,
    skippedInternational = 0,
    skippedClosed = 0;

  for (const row of rows) {
    if (row.includes("<thead>") || row.includes("<th>")) continue;
    const companyMatch = row.match(
      /<strong>(?:<a[^>]*>)?([^<]+)(?:<\/a>)?<\/strong>/,
    );
    if (!companyMatch) continue;
    const company = companyMatch[1].trim();
    const tdMatches = [...row.matchAll(/<td[^>]*>(.*?)<\/td>/gs)];
    if (tdMatches.length < 4) continue;
    const roleHtml = tdMatches[1][1];
    const roleText = roleHtml.replace(/<[^>]+>/g, "").trim();
    if (roleText.includes("🎓") || roleHtml.includes("🎓")) {
      skippedAdvancedDegree++;
      continue;
    }
    if (row.includes("🔒")) {
      skippedClosed++;
      continue;
    }
    if (roleFilter(roleText) === "non_swe") {
      skippedNonSwe++;
      continue;
    }
    const locationText =
      tdMatches[2][1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim() ||
      "United States";
    if (!isUSLocation(locationText)) {
      skippedInternational++;
      continue;
    }
    const appHtml = tdMatches[3][1];
    const allLinks = [...appHtml.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
    const directLink = allLinks.find((link) => !link.includes("simplify.jobs"));
    if (!directLink) continue;

    internships.push({
      company: company.substring(0, 255),
      role_title: roleText.substring(0, 255),
      location: locationText.substring(0, 255),
      application_link: cleanUrl(directLink),
      // 🛂 = does NOT offer sponsorship (legend), 🇺🇸 = requires US citizenship
      visa_sponsorship: row.includes("🛂") ? "No" : "Unspecified",
      us_citizen_required: row.includes("🇺🇸"),
      date_posted: null,
      source_url: sourceUrl,
      fp: fingerprint(company, roleText),
    });
  }
  return {
    internships,
    skippedNonSwe,
    skippedAdvancedDegree,
    skippedInternational,
    skippedClosed,
  };
}

// ── Parser B: community markdown pipe-table format ──
const MONTHS: Record<string, number> = {
  Jan: 1,
  Feb: 2,
  Mar: 3,
  Apr: 4,
  May: 5,
  Jun: 6,
  Jul: 7,
  Aug: 8,
  Sep: 9,
  Oct: 10,
  Nov: 11,
  Dec: 12,
};

function parsePostedDate(raw: string): string | null {
  const m = raw.trim().match(/^([A-Z][a-z]{2})\s+(\d{1,2})$/);
  if (!m || !MONTHS[m[1]]) return null;
  const now = new Date();
  let year = now.getFullYear();
  const month = MONTHS[m[1]];
  // If the parsed month is ahead of the current month, it's from last year
  if (month > now.getMonth() + 1) year -= 1;
  return `${year}-${String(month).padStart(2, "0")}-${
    String(+m[2]).padStart(2, "0")
  }`;
}

function parseMarkdownFormat(markdown: string, sourceUrl: string) {
  const internships: ParsedInternship[] = [];
  let skippedNonSwe = 0,
    skippedAdvancedDegree = 0,
    skippedInternational = 0,
    skippedClosed = 0;
  let lastCompany = "";

  const lines = markdown.split("\n");
  for (const line of lines) {
    if (!line.startsWith("|")) continue;
    const cells = line.split("|").map((c) => c.trim());
    // cells[0] is empty (leading pipe): [ '', Company, Role, Location, Link, Date, '' ]
    if (cells.length < 6) continue;
    if (/^-+$/.test(cells[1].replace(/\s/g, "-")) || cells[1] === "Company") {
      continue;
    }

    let company = cells[1].replace(/<[^>]+>/g, "").replace(/\*\*/g, "").trim();
    if (company === "↳" || company === "") company = lastCompany;
    else lastCompany = company;
    if (!company) continue;

    const roleRaw = cells[2];
    const roleText = roleRaw.replace(/<[^>]+>/g, "")
      .replace(/(?:🛂|🇺🇸|🔒)/gu, "")
      .trim();
    if (!roleText) continue;
    if (line.includes("🔒")) {
      skippedClosed++;
      continue;
    }
    if (roleRaw.includes("🎓") || roleText.includes("🎓")) {
      skippedAdvancedDegree++;
      continue;
    }
    if (roleFilter(roleText) === "non_swe") {
      skippedNonSwe++;
      continue;
    }

    const locationText = cells[3]
      .replace(/<details>.*?<summary>.*?<\/summary>/gs, "")
      .replace(/<\/?details>/g, "")
      .replace(/<\/?br\s*\/?>/g, ", ")
      .replace(/<[^>]+>/g, "")
      .replace(/\*\*/g, "")
      .replace(/\s+/g, " ")
      .trim() || "United States";
    if (!isUSLocation(locationText)) {
      skippedInternational++;
      continue;
    }

    const hrefMatch = cells[4].match(/href="([^"]+)"/);
    if (!hrefMatch) continue;
    const link = cleanUrl(hrefMatch[1]);

    internships.push({
      company: company.substring(0, 255),
      role_title: roleText.substring(0, 255),
      location: locationText.substring(0, 255),
      application_link: link,
      visa_sponsorship: line.includes("🛂") ? "No" : "Unspecified",
      us_citizen_required: line.includes("🇺🇸"),
      date_posted: cells.length >= 6 ? parsePostedDate(cells[5]) : null,
      source_url: sourceUrl,
      fp: fingerprint(company, roleText),
    });
  }
  return {
    internships,
    skippedNonSwe,
    skippedAdvancedDegree,
    skippedInternational,
    skippedClosed,
  };
}

// ── Main ──
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ success: false, error: "Method not allowed" }, 405);
  }

  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!isServiceRoleRequest(req, serviceRoleKey)) {
    return json({ success: false, error: "Unauthorized" }, 401);
  }
  const startTime = Date.now();

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      serviceRoleKey,
    );

    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const dryRun = body.dry_run === true;
    const skipDeactivation = body.skip_deactivation === true;

    // Fetch + parse all sources
    const allScraped: ParsedInternship[] = [];
    let skippedNonSwe = 0,
      skippedAdvancedDegree = 0,
      skippedInternational = 0,
      skippedClosed = 0;
    const sourceStats: Record<string, number> = {};
    const sourceErrors: string[] = [];

    for (const source of SOURCES) {
      let markdown = "";
      for (const url of source.urls) {
        try {
          markdown = await fetchTextWithTimeout(url);
          if (markdown) break;
        } catch (_) { /* try next */ }
      }
      if (!markdown) {
        sourceErrors.push(`${source.name}: fetch failed`);
        continue;
      }

      const result = source.format === "html"
        ? parseHtmlFormat(markdown, source.source_url)
        : parseMarkdownFormat(markdown, source.source_url);

      sourceStats[source.name] = result.internships.length;
      if (result.internships.length < MIN_SAFE_LISTINGS_PER_SOURCE) {
        sourceErrors.push(
          `${source.name}: parsed only ${result.internships.length} listings`,
        );
      }
      skippedNonSwe += result.skippedNonSwe;
      skippedAdvancedDegree += result.skippedAdvancedDegree;
      skippedInternational += result.skippedInternational;
      skippedClosed += result.skippedClosed;
      allScraped.push(...result.internships);
    }

    // Dedupe across sources by fingerprint (first source wins)
    const byFp = new Map<string, ParsedInternship>();
    for (const item of allScraped) {
      if (!byFp.has(item.fp)) byFp.set(item.fp, item);
    }
    const scraped = [...byFp.values()];

    console.log(
      `[auto-sync v7] Parsed ${scraped.length} unique listings`,
      JSON.stringify(sourceStats),
    );

    if (scraped.length === 0) {
      const logEntry = {
        sync_type: "scheduled",
        status: "error",
        new_jobs_found: 0,
        jobs_inserted: 0,
        jobs_deactivated: 0,
        jobs_reactivated: 0,
        total_source_listings: 0,
        skipped_duplicates: 0,
        errors: ["No internships parsed from any source", ...sourceErrors],
        duration_ms: Date.now() - startTime,
      };
      await supabase.from("scrape_sync_log").insert(logEntry);
      return new Response(JSON.stringify({ success: false, ...logEntry }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: existingRows, error: fetchErr } = await supabase
      .from("internships")
      .select(
        "id, company, role_title, application_link, is_active, source_url",
      )
      .eq("scrape_source", "simplify_jobs");
    if (fetchErr) throw new Error(`DB fetch error: ${fetchErr.message}`);

    const previousActiveBySource = new Map<string, number>();
    for (const row of existingRows ?? []) {
      if (row.is_active && row.source_url) {
        previousActiveBySource.set(
          row.source_url,
          (previousActiveBySource.get(row.source_url) ?? 0) + 1,
        );
      }
    }
    for (const source of SOURCES) {
      const previous = previousActiveBySource.get(source.source_url) ?? 0;
      const current = sourceStats[source.name] ?? 0;
      if (
        previous >= MIN_SAFE_LISTINGS_PER_SOURCE &&
        current < Math.ceil(previous * 0.5)
      ) {
        sourceErrors.push(
          `${source.name}: parsed count dropped from ${previous} to ${current}`,
        );
      }
    }

    const existingByFp = new Map<string, { id: string; is_active: boolean }>();
    for (const row of existingRows ?? []) {
      existingByFp.set(fingerprint(row.company, row.role_title), {
        id: row.id,
        is_active: row.is_active,
      });
    }

    let inserted = 0, skippedDuplicates = 0, reactivated = 0;
    const enrichmentIds: string[] = [];
    const insertErrors: string[] = [];
    const scrapedFps = new Set<string>();

    for (const item of scraped) {
      scrapedFps.add(item.fp);
      const existing = existingByFp.get(item.fp);

      if (existing) {
        if (!existing.is_active) {
          if (!dryRun) {
            const { error } = await supabase.from("internships").update({
              is_active: true,
              application_link: item.application_link,
              direct_link: item.application_link,
              location: item.location,
              final_domain: detectAts(item.application_link),
              is_texas: TEXAS_KEYWORDS.some((kw) => item.location.includes(kw)),
              remote_flag: item.location.toLowerCase().includes("remote"),
              source_url: item.source_url,
              date_posted: item.date_posted ??
                new Date().toISOString().split("T")[0],
              visa_sponsorship: item.visa_sponsorship,
              us_citizen_required: item.us_citizen_required || null,
              clearance_required: null,
              salary_min: null,
              salary_max: null,
              salary_period: null,
              deadline: null,
              work_mode: item.location.toLowerCase().includes("remote")
                ? "Remote"
                : null,
              summary_text: null,
              tech_stack: null,
              jd_raw: null,
              enrichment_confidence: null,
              archived_at: null,
              link_valid: true,
              needs_review: false,
              validation_message: null,
              enrichment_attempts: 0,
              enriched_at: null,
              updated_at: new Date().toISOString(),
            }).eq("id", existing.id);
            if (error) {
              insertErrors.push(`Reactivate ${item.company}: ${error.message}`);
            } else {
              reactivated++;
              enrichmentIds.push(existing.id);
            }
          } else reactivated++;
        } else skippedDuplicates++;
        continue;
      }

      if (!dryRun) {
        const { data: insertedRow, error } = await supabase.from("internships")
          .insert({
            company: item.company,
            role_title: item.role_title,
            location: item.location,
            application_link: item.application_link,
            direct_link: item.application_link,
            is_direct: true,
            link_type: "direct",
            final_domain: detectAts(item.application_link),
            is_texas: TEXAS_KEYWORDS.some((kw) => item.location.includes(kw)),
            remote_flag: item.location.toLowerCase().includes("remote"),
            employment_type: "internship",
            source_url: item.source_url,
            date_posted: item.date_posted ??
              new Date().toISOString().split("T")[0],
            visa_sponsorship: item.visa_sponsorship,
            us_citizen_required: item.us_citizen_required || null,
            scrape_source: "simplify_jobs",
            link_valid: true,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }).select("id").single();
        if (error || !insertedRow?.id) {
          insertErrors.push(
            `${item.company}: ${error?.message ?? "insert returned no id"}`,
          );
        } else {
          inserted++;
          enrichmentIds.push(insertedRow.id);
        }
      } else inserted++;
    }

    let deactivated = 0;
    const sourceSetComplete = SOURCES.every((source) =>
      (sourceStats[source.name] ?? 0) >= MIN_SAFE_LISTINGS_PER_SOURCE
    );
    const deactivationSkipped = skipDeactivation || sourceErrors.length > 0 ||
      insertErrors.length > 0 || !sourceSetComplete;
    if (!deactivationSkipped) {
      for (const [fp, row] of existingByFp.entries()) {
        if (!scrapedFps.has(fp) && row.is_active) {
          if (!dryRun) {
            const { error } = await supabase.from("internships").update({
              is_active: false,
              updated_at: new Date().toISOString(),
              validation_message: "Removed from source repo",
            }).eq("id", row.id);
            if (error) {
              insertErrors.push(`Deactivate ${row.id}: ${error.message}`);
            } else deactivated++;
          } else deactivated++;
        }
      }
    }

    const prioritizedIds = [...new Set(enrichmentIds)];
    const enrichmentBatchIds = prioritizedIds.slice(
      0,
      MAX_ENRICHMENT_DISPATCH,
    );
    const enrichmentSelectionErrors: string[] = [];
    if (!dryRun && enrichmentBatchIds.length < MAX_ENRICHMENT_DISPATCH) {
      const { data: backlog, error } = await supabase
        .rpc("get_internships_needing_enrichment", {
          p_limit: MAX_ENRICHMENT_DISPATCH,
        });
      if (error) {
        enrichmentSelectionErrors.push(
          `Backlog selection failed: ${error.message}`,
        );
      } else {
        const selected = new Set(enrichmentBatchIds);
        for (const candidate of backlog ?? []) {
          if (
            typeof candidate.id === "string" && !selected.has(candidate.id)
          ) {
            enrichmentBatchIds.push(candidate.id);
            selected.add(candidate.id);
          }
          if (enrichmentBatchIds.length >= MAX_ENRICHMENT_DISPATCH) break;
        }
      }
    }

    const durationMs = Date.now() - startTime;
    const enrichmentDeferred = Math.max(
      0,
      prioritizedIds.length - MAX_ENRICHMENT_DISPATCH,
    );
    const syncErrors = [
      ...sourceErrors,
      ...insertErrors,
      ...enrichmentSelectionErrors,
      ...(enrichmentDeferred > 0
        ? [`${enrichmentDeferred} listings deferred to the enrichment backlog`]
        : []),
    ];
    const logEntry = {
      sync_type: body.manual ? "manual" : "scheduled",
      status: syncErrors.length > 0
        ? "partial"
        : enrichmentBatchIds.length > 0 && !dryRun
        ? "enriching"
        : "success",
      new_jobs_found: inserted + reactivated,
      jobs_inserted: inserted,
      jobs_deactivated: deactivated,
      jobs_reactivated: reactivated,
      jobs_enriched: 0,
      jobs_enrich_failed: 0,
      total_source_listings: scraped.length,
      skipped_duplicates: skippedDuplicates,
      skipped_non_swe: skippedNonSwe,
      skipped_advanced_degree: skippedAdvancedDegree,
      skipped_international: skippedInternational,
      errors: syncErrors.length > 0 ? syncErrors.slice(0, 10) : null,
      duration_ms: durationMs,
    };
    let syncLogId: string | undefined;
    if (!dryRun) {
      const { data: syncLog, error: syncLogError } = await supabase
        .from("scrape_sync_log")
        .insert(logEntry)
        .select("id")
        .single();
      if (syncLogError) {
        console.error(
          "[auto-sync v7] Sync log insert failed:",
          syncLogError.message,
        );
      } else syncLogId = syncLog?.id;
    }

    let enrichmentQueued = 0;
    let enrichmentDispatchError: string | null = null;
    if (enrichmentBatchIds.length > 0 && !dryRun) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 10000);
        let enrichResp: Response;
        try {
          enrichResp = await fetch(
            `${Deno.env.get("SUPABASE_URL")}/functions/v1/enrich-internship`,
            {
              method: "POST",
              headers: serviceRoleHeaders(serviceRoleKey),
              body: JSON.stringify({
                ids: enrichmentBatchIds,
                sync_log_id: syncLogId,
              }),
              signal: controller.signal,
            },
          );
        } finally {
          clearTimeout(timer);
        }
        if (!enrichResp.ok) {
          throw new Error(`worker returned HTTP ${enrichResp.status}`);
        }
        const result = await enrichResp.json() as { queued?: number };
        enrichmentQueued = result.queued ?? 0;
      } catch (error) {
        enrichmentDispatchError = `Enrichment dispatch failed: ${
          String(error)
        }`;
        console.error("[auto-sync v7]", enrichmentDispatchError);
        if (syncLogId) {
          await supabase.from("scrape_sync_log").update({
            status: "partial",
            jobs_enrich_failed: enrichmentBatchIds.length,
            errors: [...syncErrors, enrichmentDispatchError].slice(0, 10),
          }).eq("id", syncLogId);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        dry_run: dryRun,
        sources: sourceStats,
        total_unique_listings: scraped.length,
        inserted,
        skipped_duplicates: skippedDuplicates,
        deactivated,
        reactivated,
        deactivation_skipped: deactivationSkipped,
        skipped_closed: skippedClosed,
        enrichment_queued: enrichmentQueued,
        enrichment_deferred: enrichmentDeferred,
        errors: [
          ...syncErrors,
          ...(enrichmentDispatchError ? [enrichmentDispatchError] : []),
        ].slice(0, 5),
        duration_ms: durationMs,
        sample: scraped.slice(0, 3).map((i) => ({
          company: i.company,
          role: i.role_title,
          location: i.location,
          posted: i.date_posted,
        })),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const message = error instanceof Error ? error.message : String(error);
    console.error("[auto-sync v7] Fatal error:", error);
    try {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        serviceRoleKey,
      );
      await supabase.from("scrape_sync_log").insert({
        sync_type: "scheduled",
        status: "error",
        new_jobs_found: 0,
        jobs_inserted: 0,
        jobs_deactivated: 0,
        jobs_reactivated: 0,
        total_source_listings: 0,
        skipped_duplicates: 0,
        errors: [message],
        duration_ms: durationMs,
      });
    } catch (_) { /* ignore */ }
    return json(
      { success: false, error: message, duration_ms: durationMs },
      500,
    );
  }
});
