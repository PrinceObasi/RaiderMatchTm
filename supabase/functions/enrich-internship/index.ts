// enrich-internship v122 — fix: enrichment_confidence uses the 0-100 integer scale (85 = ai, 50 = deterministic)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AiEnrichmentResult {
  clearance_required?: boolean
  deadline?: string | null
  salary_max?: number | null
  salary_min?: number | null
  salary_period?: 'hour' | 'year' | null
  summary?: string | null
  tech_stack?: string[] | null
  us_citizen_required?: boolean
  visa_sponsorship?: 'Yes' | 'No' | null
  work_mode?: 'Remote' | 'Hybrid' | 'On-site' | null
}

interface GeminiGenerateContentResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>
    }
  }>
}

interface SkillAliasRow {
  canonical_skill: string | null
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function stripHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&amp;|&lt;|&gt;|&#\d+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractEligibility(text: string) {
  const t = text.toLowerCase()
  const citizen =
    /u\.?s\.?\s+citizen(ship)?\s+(is\s+)?required|must\s+be\s+(a\s+)?u\.?s\.?\s+citizen|u\.?s\.?\s+citizens?\s+only/.test(t)
  const clearance =
    /security\s+clearance|(secret|top\s+secret|ts\/?sci)\s+clearance|clearance\s+(is\s+)?required|ability\s+to\s+obtain\s+[^.]{0,40}clearance/.test(t)
  let sponsorship: 'Yes' | 'No' | null = null
  if (/(not|unable\s+to|cannot|will\s+not|won'?t|no)\s+(be\s+able\s+to\s+)?(provide\s+|offer\s+)?(visa\s+)?sponsor|without\s+(the\s+need\s+for\s+)?(visa\s+)?sponsorship|not\s+eligible\s+for\s+(visa\s+)?sponsorship/.test(t)) {
    sponsorship = 'No'
  } else if (/visa\s+sponsorship\s+(is\s+)?available|will\s+sponsor|sponsorship\s+(is\s+)?provided/.test(t)) {
    sponsorship = 'Yes'
  }
  return { citizen, clearance, sponsorship }
}

function extractTechStack(text: string, canonicalSkills: string[]): string[] {
  const t = ' ' + text.toLowerCase() + ' '
  const found: string[] = []
  for (const skill of canonicalSkills) {
    const s = String(skill ?? '').toLowerCase()
    if (!s) continue
    const escaped = s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    try {
      const re = new RegExp(`[^a-z0-9]${escaped}[^a-z0-9]`, 'i')
      if (re.test(t)) found.push(s)
    } catch (_) { /* skip bad patterns */ }
    if (found.length >= 12) break
  }
  return found
}

function extractSalary(text: string) {
  const hourly = text.match(/\$\s*(\d{2,3})(?:\.\d{2})?\s*[-–—to]{1,4}\s*\$?\s*(\d{2,3})(?:\.\d{2})?\s*(?:per\s+hour|\/\s*(?:hr|hour)|hourly)/i)
  if (hourly) return { min: +hourly[1], max: +hourly[2], period: 'hour' }
  const single = text.match(/\$\s*(\d{2,3})(?:\.\d{2})?\s*(?:per\s+hour|\/\s*(?:hr|hour)|hourly)/i)
  if (single) return { min: +single[1], max: +single[1], period: 'hour' }
  return null
}

async function enrichWithGemini(text: string, apiKey: string): Promise<AiEnrichmentResult | null> {
  const prompt = `Analyze this internship job posting. Return ONLY valid JSON (no markdown fences) with this exact shape:
{
  "summary": "2-3 sentences on what the intern will BUILD, LEARN, and DO.",
  "tech_stack": ["lowercase", "tags", "max 12"],
  "work_mode": "Remote" | "Hybrid" | "On-site" | null,
  "deadline": "YYYY-MM-DD" | null,
  "salary_min": number | null,
  "salary_max": number | null,
  "salary_period": "hour" | "year" | null,
  "us_citizen_required": boolean,
  "clearance_required": boolean,
  "visa_sponsorship": "Yes" | "No" | null
}
Rules: only state eligibility as true/"No" if explicit; do not invent salary or deadline.

POSTING:
${text.slice(0, 14000)}`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 25000)
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
        }),
      },
    )
    if (!res.ok) {
      console.error('Gemini HTTP error', res.status)
      return null
    }
    const data = await res.json() as GeminiGenerateContentResponse
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!raw) return null
    return JSON.parse(raw) as AiEnrichmentResult
  } catch (e) {
    console.error('Gemini call failed:', e)
    return null
  } finally {
    clearTimeout(timer)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return json({ ok: false, reason: 'Method not allowed' }, 405)

  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const authorization = req.headers.get('Authorization')
  if (!serviceRoleKey || authorization !== `Bearer ${serviceRoleKey}`) {
    return json({ ok: false, reason: 'Unauthorized' }, 401)
  }

  let stage = 'init'
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      serviceRoleKey,
    )

    stage = 'parse_body'
    const { id } = await req.json().catch(() => ({}))
    if (!id) return json({ ok: false, reason: 'Missing required field: id' }, 400)

    stage = 'fetch_row'
    const { data: job, error: fetchError } = await supabase
      .from('internships')
      .select('id, company, role_title, direct_link, application_link, enriched_at, enrichment_attempts, is_active')
      .eq('id', id)
      .single()

    if (fetchError || !job) return json({ ok: false, stage, reason: fetchError?.message ?? 'Internship not found' }, 404)

    if (job.enriched_at && new Date(job.enriched_at) > new Date(Date.now() - 86400000)) {
      return json({ ok: true, skipped: true })
    }

    const attempts = (job.enrichment_attempts ?? 0) + 1
    const url = job.direct_link || job.application_link
    if (!url) {
      await supabase.from('internships').update({ enrichment_attempts: attempts, needs_review: true }).eq('id', id)
      return json({ ok: false, stage: 'no_url', reason: 'No URL to fetch' })
    }

    stage = 'fetch_page'
    let html = ''
    let fetchStatus = 0
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 12000)
      const page = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RaiderMatchBot/1.0)' },
        redirect: 'follow',
      })
      clearTimeout(timer)
      fetchStatus = page.status
      if (page.ok) html = await page.text()
    } catch (e) {
      console.error(`Page fetch failed for ${id}:`, String(e))
    }

    if (fetchStatus === 404 || fetchStatus === 410) {
      await supabase.from('internships').update({
        enrichment_attempts: attempts, needs_review: true, link_valid: false,
      }).eq('id', id)
      return json({ archived: true, reason: `Posting returned ${fetchStatus}` })
    }

    stage = 'extract'
    const text = stripHtml(html)
    const usableText = text.length >= 200 ? text : `${job.role_title} at ${job.company}`

    const { data: aliases } = await supabase.from('skill_aliases').select('canonical_skill')
    const canonical = [...new Set(
      (aliases ?? [])
        .map((alias: SkillAliasRow) => alias.canonical_skill)
        .filter((skill: string | null): skill is string => Boolean(skill)),
    )]
    const detTech = extractTechStack(usableText, canonical)
    const elig = extractEligibility(usableText)
    const sal = extractSalary(usableText)

    stage = 'ai'
    const apiKey = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('GOOGLE_API_KEY') || Deno.env.get('LOVABLE_API_KEY')
    let ai: AiEnrichmentResult | null = null
    if (apiKey && text.length >= 200) {
      ai = await enrichWithGemini(text, apiKey)
    }

    stage = 'update'
    const techStack = (ai?.tech_stack?.length ? ai.tech_stack : detTech).slice(0, 12).map((t: string) => String(t).toLowerCase().trim())
    const summary = ai?.summary || (text.length >= 200 ? null : `${job.role_title} internship at ${job.company}.`)

    const update: Record<string, unknown> = {
      enrichment_attempts: attempts,
      enriched_at: new Date().toISOString(),
      enrichment_confidence: ai ? 85 : 50,   // 0-100 integer scale (existing convention)
      tech_stack: techStack,
      us_citizen_required: Boolean(ai?.us_citizen_required || elig.citizen),
      clearance_required: Boolean(ai?.clearance_required || elig.clearance),
    }
    if (summary) update.summary_text = summary
    if (text.length >= 200) update.jd_raw = text.slice(0, 50000)

    const sponsorship = ai?.visa_sponsorship ?? elig.sponsorship
    if (sponsorship === 'Yes' || sponsorship === 'No') update.visa_sponsorship = sponsorship

    const salaryMin = ai?.salary_min ?? sal?.min
    const salaryMax = ai?.salary_max ?? sal?.max
    const salaryPeriod = ai?.salary_period ?? sal?.period
    if (salaryMin != null) update.salary_min = salaryMin
    if (salaryMax != null) update.salary_max = salaryMax
    if (salaryPeriod) update.salary_period = salaryPeriod
    if (ai?.work_mode && ['Remote', 'Hybrid', 'On-site'].includes(ai.work_mode)) update.work_mode = ai.work_mode
    if (ai?.deadline && /^\d{4}-\d{2}-\d{2}$/.test(ai.deadline)) update.deadline = ai.deadline

    const { error: updateError } = await supabase.from('internships').update(update).eq('id', id)
    if (updateError) {
      console.error('Update failed:', updateError.message)
      return json({ ok: false, stage, reason: updateError.message }, 500)
    }

    return json({ ok: true, enriched_with: ai ? 'ai+deterministic' : 'deterministic', tech_count: techStack.length })
  } catch (error) {
    console.error('Unexpected error at stage', stage, ':', String(error))
    return json({ ok: false, stage, reason: String(error) }, 500)
  }
})
