// enrich-internship v124 — authenticated single + bounded background batch enrichment
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.1";
import { fetchPublicPage } from "../_shared/public-page.ts";
import { isServiceRoleRequest } from "../_shared/service-role.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AiEnrichmentResult {
  clearance_required?: boolean;
  deadline?: string | null;
  salary_max?: number | null;
  salary_min?: number | null;
  salary_period?: "hour" | "year" | null;
  summary?: string | null;
  tech_stack?: string[] | null;
  us_citizen_required?: boolean;
  visa_sponsorship?: "Yes" | "No" | null;
  work_mode?: "Remote" | "Hybrid" | "On-site" | null;
}

interface GeminiGenerateContentResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}

interface LovableChatCompletionResponse {
  choices?: Array<{
    message?: { content?: string };
  }>;
}

interface SkillAliasRow {
  alias: string;
  canonical: string;
}

interface InternshipRow {
  id: string;
  company: string;
  role_title: string;
  direct_link: string | null;
  application_link: string | null;
  enriched_at: string | null;
  enrichment_attempts: number | null;
  is_active: boolean | null;
  updated_at: string | null;
  us_citizen_required: boolean | null;
  clearance_required: boolean | null;
  visa_sponsorship: "Yes" | "No" | "Unspecified" | null;
}

type EnrichmentOutcome =
  | {
    status: "enriched";
    enriched_with: "ai+deterministic" | "deterministic";
    tech_count: number;
  }
  | { status: "archived"; reason: string }
  | { status: "skipped"; reason: string }
  | { status: "failed"; stage: string; reason: string; http_status?: number };

interface BatchSummary {
  processed: number;
  enriched: number;
  archived: number;
  skipped: number;
  failed: number;
}

const MAX_BATCH_SIZE = 15;
const BATCH_CONCURRENCY = 5;
const MAX_ENRICHMENT_ATTEMPTS = 3;
const ENRICHMENT_COOLDOWN_MS = 2 * 60 * 1000;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function stripHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&amp;|&lt;|&gt;|&#\d+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractEligibility(text: string) {
  const t = text.toLowerCase();
  const citizen =
    /u\.?s\.?\s+citizen(ship)?\s+(is\s+)?required|must\s+be\s+(a\s+)?u\.?s\.?\s+citizen|u\.?s\.?\s+citizens?\s+only/
      .test(t);
  const clearance =
    /security\s+clearance|(secret|top\s+secret|ts\/?sci)\s+clearance|clearance\s+(is\s+)?required|ability\s+to\s+obtain\s+[^.]{0,40}clearance/
      .test(t);
  let sponsorship: "Yes" | "No" | null = null;
  if (
    /(not|unable\s+to|cannot|will\s+not|won'?t|no)\s+(be\s+able\s+to\s+)?(provide\s+|offer\s+)?(visa\s+)?sponsor|without\s+(the\s+need\s+for\s+)?(visa\s+)?sponsorship|not\s+eligible\s+for\s+(visa\s+)?sponsorship/
      .test(t)
  ) {
    sponsorship = "No";
  } else if (
    /visa\s+sponsorship\s+(is\s+)?available|will\s+sponsor|sponsorship\s+(is\s+)?provided/
      .test(t)
  ) {
    sponsorship = "Yes";
  }
  return { citizen, clearance, sponsorship };
}

function extractTechStack(
  text: string,
  skillAliases: SkillAliasRow[],
): string[] {
  const t = " " + text.toLowerCase() + " ";
  const found = new Set<string>();
  for (const row of skillAliases) {
    const alias = String(row.alias ?? "").toLowerCase().trim();
    const canonical = String(row.canonical ?? "").toLowerCase().trim();
    if (!alias || !canonical) continue;
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    try {
      const re = new RegExp(`[^a-z0-9]${escaped}[^a-z0-9]`, "i");
      if (re.test(t)) found.add(canonical);
    } catch (_) { /* skip bad patterns */ }
    if (found.size >= 12) break;
  }
  return [...found];
}

function extractSalary(text: string) {
  const hourly = text.match(
    /\$\s*(\d{2,3})(?:\.\d{2})?\s*[-–—to]{1,4}\s*\$?\s*(\d{2,3})(?:\.\d{2})?\s*(?:per\s+hour|\/\s*(?:hr|hour)|hourly)/i,
  );
  if (hourly) return { min: +hourly[1], max: +hourly[2], period: "hour" };
  const single = text.match(
    /\$\s*(\d{2,3})(?:\.\d{2})?\s*(?:per\s+hour|\/\s*(?:hr|hour)|hourly)/i,
  );
  if (single) return { min: +single[1], max: +single[1], period: "hour" };
  return null;
}

function enrichmentPrompt(text: string) {
  return `Analyze this internship job posting. Return ONLY valid JSON (no markdown fences) with this exact shape:
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
${text.slice(0, 14000)}`;
}

function parseAiResult(raw: string): AiEnrichmentResult | null {
  const cleaned = raw.trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  return normalizeAiResult(JSON.parse(cleaned));
}

async function enrichWithGemini(
  text: string,
  apiKey: string,
): Promise<AiEnrichmentResult | null> {
  const prompt = enrichmentPrompt(text);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
          },
        }),
      },
    );
    if (!res.ok) {
      console.error("Gemini HTTP error", res.status);
      return null;
    }
    const data = await res.json() as GeminiGenerateContentResponse;
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) return null;
    return parseAiResult(raw);
  } catch (e) {
    console.error("Gemini call failed:", e);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function enrichWithLovable(
  text: string,
  apiKey: string,
): Promise<AiEnrichmentResult | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  try {
    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "user", content: enrichmentPrompt(text) }],
          temperature: 0.2,
        }),
      },
    );
    if (!response.ok) {
      console.error("Lovable AI HTTP error", response.status);
      return null;
    }
    const data = await response.json() as LovableChatCompletionResponse;
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) return null;
    return parseAiResult(raw);
  } catch (error) {
    console.error("Lovable AI call failed:", error);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function normalizeAiResult(value: unknown): AiEnrichmentResult | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const result: AiEnrichmentResult = {};

  if (typeof input.summary === "string") {
    result.summary = input.summary.trim().slice(0, 2000) || null;
  }
  if (Array.isArray(input.tech_stack)) {
    result.tech_stack = input.tech_stack
      .filter((skill): skill is string => typeof skill === "string")
      .map((skill) => skill.toLowerCase().trim())
      .filter(Boolean)
      .slice(0, 12);
  }
  if (
    input.work_mode === "Remote" || input.work_mode === "Hybrid" ||
    input.work_mode === "On-site"
  ) {
    result.work_mode = input.work_mode;
  }
  if (
    typeof input.deadline === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(input.deadline)
  ) {
    result.deadline = input.deadline;
  }
  for (const field of ["salary_min", "salary_max"] as const) {
    const numericValue = input[field];
    if (typeof numericValue === "number" && Number.isFinite(numericValue)) {
      result[field] = numericValue;
    }
  }
  if (input.salary_period === "hour" || input.salary_period === "year") {
    result.salary_period = input.salary_period;
  }
  if (typeof input.us_citizen_required === "boolean") {
    result.us_citizen_required = input.us_citizen_required;
  }
  if (typeof input.clearance_required === "boolean") {
    result.clearance_required = input.clearance_required;
  }
  if (input.visa_sponsorship === "Yes" || input.visa_sponsorship === "No") {
    result.visa_sponsorship = input.visa_sponsorship;
  }

  return Object.keys(result).length > 0 ? result : null;
}

function createServiceClient(url: string, serviceRoleKey: string) {
  return createClient(url, serviceRoleKey);
}

type ServiceClient = ReturnType<typeof createServiceClient>;

async function loadSkillAliases(
  supabase: ServiceClient,
): Promise<SkillAliasRow[]> {
  const { data, error } = await supabase.from("skill_aliases").select(
    "alias, canonical",
  );
  if (error) {
    console.error("Skill alias fetch failed:", error.message);
    return [];
  }
  return (data ?? []) as SkillAliasRow[];
}

async function updateFailedAttempt(
  supabase: ServiceClient,
  id: string,
  attempts: number,
  message: string,
) {
  const { error } = await supabase.from("internships").update({
    needs_review: attempts >= MAX_ENRICHMENT_ATTEMPTS,
    validation_message: message.slice(0, 500),
    updated_at: new Date().toISOString(),
  }).eq("id", id).eq("enrichment_attempts", attempts);
  if (error) {
    console.error(
      `Failed to record enrichment error for ${id}:`,
      error.message,
    );
  }
}

async function enrichOne(
  supabase: ServiceClient,
  id: string,
  skillAliases: SkillAliasRow[],
): Promise<EnrichmentOutcome> {
  let stage = "fetch_row";
  let claimedAttempts: number | null = null;
  try {
    const { data, error: fetchError } = await supabase
      .from("internships")
      .select(
        "id, company, role_title, direct_link, application_link, enriched_at, enrichment_attempts, is_active, updated_at, us_citizen_required, clearance_required, visa_sponsorship",
      )
      .eq("id", id)
      .single();

    if (fetchError || !data) {
      return {
        status: "failed",
        stage,
        reason: fetchError?.message ?? "Internship not found",
        http_status: 404,
      };
    }
    const job = data as InternshipRow;

    if (job.is_active === false) {
      return { status: "skipped", reason: "Internship is inactive" };
    }
    if (
      job.enriched_at &&
      new Date(job.enriched_at).getTime() > Date.now() - 86400000
    ) {
      return { status: "skipped", reason: "Already enriched within 24 hours" };
    }

    const previousAttempts = job.enrichment_attempts ?? 0;
    if (previousAttempts >= MAX_ENRICHMENT_ATTEMPTS) {
      return {
        status: "skipped",
        reason: "Maximum enrichment attempts reached",
      };
    }
    if (
      previousAttempts > 0 &&
      !job.enriched_at &&
      job.updated_at &&
      new Date(job.updated_at).getTime() > Date.now() - ENRICHMENT_COOLDOWN_MS
    ) {
      return { status: "skipped", reason: "Enrichment is already in progress" };
    }

    stage = "claim";
    const attempts = previousAttempts + 1;
    const claimTime = new Date().toISOString();
    let claimQuery = supabase.from("internships").update({
      enrichment_attempts: attempts,
      updated_at: claimTime,
    }).eq("id", id);
    claimQuery = job.enrichment_attempts == null
      ? claimQuery.is("enrichment_attempts", null)
      : claimQuery.eq("enrichment_attempts", job.enrichment_attempts);
    const { data: claim, error: claimError } = await claimQuery.select("id")
      .maybeSingle();
    if (claimError) {
      return {
        status: "failed",
        stage,
        reason: claimError.message,
        http_status: 500,
      };
    }
    if (!claim) {
      return {
        status: "skipped",
        reason: "Internship was claimed by another worker",
      };
    }
    claimedAttempts = attempts;

    const url = job.direct_link || job.application_link;
    if (!url) {
      await updateFailedAttempt(supabase, id, attempts, "No URL to fetch");
      return { status: "failed", stage: "no_url", reason: "No URL to fetch" };
    }

    stage = "fetch_page";
    let html = "";
    let fetchStatus = 0;
    let fetchFailure = "Posting fetch failed or timed out";
    try {
      const page = await fetchPublicPage(url);
      fetchStatus = page.status;
      html = page.html;
    } catch (error) {
      fetchFailure = error instanceof Error ? error.message : String(error);
      console.error(`Page fetch failed for ${id}:`, String(error));
    }

    if (fetchStatus === 404 || fetchStatus === 410) {
      const reason = `Posting returned ${fetchStatus}`;
      const { error } = await supabase.from("internships").update({
        is_active: false,
        archived_at: new Date().toISOString(),
        needs_review: true,
        link_valid: false,
        validation_message: reason,
        updated_at: new Date().toISOString(),
      }).eq("id", id).eq("enrichment_attempts", attempts);
      if (error) {
        await updateFailedAttempt(supabase, id, attempts, error.message);
        return {
          status: "failed",
          stage: "archive",
          reason: error.message,
          http_status: 500,
        };
      }
      return { status: "archived", reason };
    }

    const text = stripHtml(html);
    if (fetchStatus < 200 || fetchStatus >= 300 || text.length < 200) {
      const reason = fetchStatus
        ? `Posting fetch returned ${fetchStatus} or insufficient content`
        : fetchFailure;
      await updateFailedAttempt(supabase, id, attempts, reason);
      return { status: "failed", stage, reason };
    }

    stage = "extract";
    const detTech = extractTechStack(text, skillAliases);
    const elig = extractEligibility(text);
    const salary = extractSalary(text);

    stage = "ai";
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY") ||
      Deno.env.get("GOOGLE_API_KEY");
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const aiConfigured = Boolean(geminiApiKey || lovableApiKey);
    const ai = geminiApiKey
      ? await enrichWithGemini(text, geminiApiKey)
      : lovableApiKey
      ? await enrichWithLovable(text, lovableApiKey)
      : null;
    if (aiConfigured && !ai) {
      const reason = "AI enrichment failed; eligible for retry";
      await updateFailedAttempt(supabase, id, attempts, reason);
      return { status: "failed", stage, reason };
    }

    stage = "update";
    const techStack = (ai?.tech_stack?.length ? ai.tech_stack : detTech)
      .slice(0, 12)
      .map((skill) => String(skill).toLowerCase().trim())
      .filter(Boolean);
    const now = new Date().toISOString();
    const update: Record<string, unknown> = {
      enrichment_attempts: 0,
      enriched_at: now,
      enrichment_confidence: ai ? 85 : 50,
      tech_stack: techStack,
      jd_raw: text.slice(0, 50000),
      us_citizen_required: Boolean(
        job.us_citizen_required || ai?.us_citizen_required || elig.citizen,
      ),
      clearance_required: Boolean(
        job.clearance_required || ai?.clearance_required || elig.clearance,
      ),
      needs_review: false,
      validation_message: null,
      updated_at: now,
    };
    if (ai?.summary) update.summary_text = ai.summary;

    const detectedSponsorship = ai?.visa_sponsorship ?? elig.sponsorship;
    const sponsorship = job.visa_sponsorship === "No" ||
        detectedSponsorship === "No"
      ? "No"
      : detectedSponsorship;
    if (sponsorship === "Yes" || sponsorship === "No") {
      update.visa_sponsorship = sponsorship;
    }

    const salaryMin = ai?.salary_min ?? salary?.min;
    const salaryMax = ai?.salary_max ?? salary?.max;
    const salaryPeriod = ai?.salary_period ?? salary?.period;
    if (salaryMin != null) update.salary_min = salaryMin;
    if (salaryMax != null) update.salary_max = salaryMax;
    if (salaryPeriod) update.salary_period = salaryPeriod;
    if (ai?.work_mode) update.work_mode = ai.work_mode;
    if (ai?.deadline) update.deadline = ai.deadline;

    const { data: updated, error: updateError } = await supabase
      .from("internships")
      .update(update)
      .eq("id", id)
      .eq("enrichment_attempts", attempts)
      .select("id")
      .maybeSingle();
    if (updateError) {
      await updateFailedAttempt(supabase, id, attempts, updateError.message);
      return {
        status: "failed",
        stage,
        reason: updateError.message,
        http_status: 500,
      };
    }
    if (!updated) {
      return {
        status: "skipped",
        reason: "A newer enrichment attempt superseded this update",
      };
    }

    return {
      status: "enriched",
      enriched_with: ai ? "ai+deterministic" : "deterministic",
      tech_count: techStack.length,
    };
  } catch (error) {
    console.error(
      "Unexpected enrichment error at stage",
      stage,
      ":",
      String(error),
    );
    if (claimedAttempts != null) {
      await updateFailedAttempt(supabase, id, claimedAttempts, String(error));
    }
    return { status: "failed", stage, reason: String(error), http_status: 500 };
  }
}

async function runBatch(
  supabase: ServiceClient,
  ids: string[],
  syncLogId?: string,
): Promise<BatchSummary> {
  const skillAliases = await loadSkillAliases(supabase);
  const outcomes: Array<{ id: string; outcome: EnrichmentOutcome }> = [];
  let baseStatus = "enriching";
  let baseErrors: string[] = [];

  if (syncLogId) {
    const { data: syncLog, error } = await supabase.from("scrape_sync_log")
      .select("status, errors")
      .eq("id", syncLogId)
      .maybeSingle();
    if (error) console.error("Failed to read sync log:", error.message);
    if (syncLog?.status) baseStatus = syncLog.status;
    const existingErrors = syncLog?.errors;
    if (Array.isArray(existingErrors)) baseErrors = existingErrors;
  }

  for (let start = 0; start < ids.length; start += BATCH_CONCURRENCY) {
    const chunk = ids.slice(start, start + BATCH_CONCURRENCY);
    const chunkOutcomes = await Promise.all(
      chunk.map(async (id) => ({
        id,
        outcome: await enrichOne(supabase, id, skillAliases),
      })),
    );
    outcomes.push(...chunkOutcomes);

    if (syncLogId) {
      const enriched = outcomes.filter(({ outcome }) =>
        outcome.status === "enriched"
      ).length;
      const archived = outcomes.filter(({ outcome }) =>
        outcome.status === "archived"
      ).length;
      const failed =
        outcomes.filter(({ outcome }) => outcome.status === "failed").length;
      const complete = outcomes.length === ids.length;
      const enrichmentErrors = outcomes
        .filter(({ outcome }) =>
          outcome.status === "failed" || outcome.status === "archived"
        )
        .map(({ id, outcome }) =>
          `${id}: ${"reason" in outcome ? outcome.reason : outcome.status}`
        );
      const status = complete
        ? baseStatus === "partial" || failed + archived > 0
          ? "partial"
          : "success"
        : baseStatus === "partial"
        ? "partial"
        : "enriching";
      const { error } = await supabase.from("scrape_sync_log").update({
        status,
        jobs_enriched: enriched,
        jobs_enrich_failed: failed + archived,
        errors: [...baseErrors, ...enrichmentErrors].slice(0, 10),
      }).eq("id", syncLogId);
      if (error) {
        console.error("Failed to checkpoint enrichment totals:", error.message);
      }
    }
  }

  const summary: BatchSummary = {
    processed: outcomes.length,
    enriched:
      outcomes.filter(({ outcome }) => outcome.status === "enriched").length,
    archived:
      outcomes.filter(({ outcome }) => outcome.status === "archived").length,
    skipped:
      outcomes.filter(({ outcome }) => outcome.status === "skipped").length,
    failed:
      outcomes.filter(({ outcome }) => outcome.status === "failed").length,
  };
  console.log("[enrich-internship] Batch complete", JSON.stringify(summary));
  return summary;
}

async function runBatchSafely(
  supabase: ServiceClient,
  ids: string[],
  syncLogId?: string,
) {
  try {
    await runBatch(supabase, ids, syncLogId);
  } catch (error) {
    console.error("Background enrichment batch failed:", String(error));
    if (syncLogId) {
      const { data: syncLog } = await supabase.from("scrape_sync_log")
        .select("errors")
        .eq("id", syncLogId)
        .maybeSingle();
      const existingErrors = syncLog?.errors;
      await supabase.from("scrape_sync_log").update({
        status: "partial",
        errors: [
          ...(Array.isArray(existingErrors) ? existingErrors : []),
          `Background enrichment stopped: ${String(error)}`,
        ].slice(0, 10),
      }).eq("id", syncLogId);
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ ok: false, reason: "Method not allowed" }, 405);
  }

  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!isServiceRoleRequest(req, serviceRoleKey)) {
    return json({ ok: false, reason: "Unauthorized" }, 401);
  }

  try {
    const supabase = createServiceClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      serviceRoleKey,
    );
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;

    if (Array.isArray(body.ids)) {
      const ids = [...new Set(body.ids)];
      if (
        ids.length === 0 || ids.length > MAX_BATCH_SIZE ||
        ids.some((id) => typeof id !== "string" || !UUID_PATTERN.test(id))
      ) {
        return json({
          ok: false,
          reason:
            `ids must contain 1-${MAX_BATCH_SIZE} unique internship UUIDs`,
        }, 400);
      }
      const syncLogId = typeof body.sync_log_id === "string" &&
          UUID_PATTERN.test(body.sync_log_id)
        ? body.sync_log_id
        : undefined;
      const edgeRuntime = (globalThis as typeof globalThis & {
        EdgeRuntime?: { waitUntil(promise: Promise<unknown>): void };
      }).EdgeRuntime;
      if (!edgeRuntime?.waitUntil) {
        return json({
          ok: false,
          reason: "Background task runtime is unavailable",
        }, 503);
      }

      edgeRuntime.waitUntil(
        runBatchSafely(supabase, ids as string[], syncLogId),
      );
      return json({ ok: true, status: "queued", queued: ids.length }, 202);
    }

    if (typeof body.id !== "string" || !UUID_PATTERN.test(body.id)) {
      return json({
        ok: false,
        reason: "Missing or invalid required field: id",
      }, 400);
    }

    const skillAliases = await loadSkillAliases(supabase);
    const outcome = await enrichOne(supabase, body.id, skillAliases);
    if (outcome.status === "enriched") return json({ ok: true, ...outcome });
    if (outcome.status === "archived") {
      return json({ archived: true, reason: outcome.reason });
    }
    if (outcome.status === "skipped") {
      return json({ ok: true, skipped: true, reason: outcome.reason });
    }
    return json(
      { ok: false, stage: outcome.stage, reason: outcome.reason },
      outcome.http_status ?? 200,
    );
  } catch (error) {
    console.error("Enrichment request failed:", String(error));
    return json({ ok: false, stage: "request", reason: String(error) }, 500);
  }
});
