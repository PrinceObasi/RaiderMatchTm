import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.1";
import { fetchPublicPage } from "../_shared/public-page.ts";
import { isServiceRoleRequest } from "../_shared/service-role.ts";
import { classifyPostingPage, type PageClassification } from "./validation.ts";

const DEFAULT_BATCH_SIZE = 50;
const MAX_BATCH_SIZE = 50;
const VALIDATION_INTERVAL_MS = 24 * 60 * 60 * 1000;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

async function requestedBatchSize(req: Request): Promise<number> {
  try {
    const body = await req.json();
    const value = Number(body?.batch_size);
    if (Number.isInteger(value) && value > 0) {
      return Math.min(value, MAX_BATCH_SIZE);
    }
  } catch {
    // The scheduled caller may omit a body; use the bounded default.
  }
  return DEFAULT_BATCH_SIZE;
}

function fetchFailure(error: unknown): PageClassification {
  const message = error instanceof Error ? error.message : "Validation failed";
  if (message === "Unsafe posting URL") {
    return { verdict: "invalid", message };
  }
  return {
    verdict: "inconclusive",
    message: message.includes("aborted")
      ? "Validation was inconclusive (timeout)"
      : "Validation was inconclusive (request failed)",
  };
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(null, { status: 405, headers: { Allow: "POST" } });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Link validator is missing Supabase configuration");
    return json({ error: "Service unavailable" }, 503);
  }
  if (!isServiceRoleRequest(req, serviceRoleKey)) {
    return json({ error: "Unauthorized" }, 401);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const batchSize = await requestedBatchSize(req);
  const cutoff = new Date(Date.now() - VALIDATION_INTERVAL_MS).toISOString();

  const { data: internships, error: fetchError } = await supabase
    .from("internships")
    .select("id, application_link, link_valid")
    .eq("is_active", true)
    .not("application_link", "is", null)
    .or(`last_validated_at.is.null,last_validated_at.lt.${cutoff}`)
    .order("last_validated_at", { ascending: true, nullsFirst: true })
    .limit(batchSize);

  if (fetchError) {
    console.error("Failed to load internships for link validation", fetchError);
    return json({ error: "Unable to load validation batch" }, 500);
  }

  const counts = { valid: 0, invalid: 0, inconclusive: 0, errors: 0 };

  for (const internship of internships ?? []) {
    const checkedAt = new Date().toISOString();
    let statusCode = 0;
    let classification: PageClassification;

    try {
      const page = await fetchPublicPage(internship.application_link);
      statusCode = page.status;
      classification = classifyPostingPage(page.status, page.html);
    } catch (error) {
      classification = fetchFailure(error);
    }

    counts[classification.verdict] += 1;

    const update: Record<string, unknown> = {
      last_validated_at: checkedAt,
      validation_message: classification.message.slice(0, 500),
    };
    if (classification.verdict !== "inconclusive") {
      update.link_valid = classification.verdict === "valid";
    }

    const { error: updateError } = await supabase
      .from("internships")
      .update(update)
      .eq("id", internship.id);
    if (updateError) {
      counts.errors += 1;
      console.error("Failed to store an internship validation result", {
        internshipId: internship.id,
        error: updateError,
      });
    }

    const historyWasValid = classification.verdict === "inconclusive"
      ? internship.link_valid !== false
      : classification.verdict === "valid";
    const { error: historyError } = await supabase
      .from("internship_validation_history")
      .insert({
        internship_id: internship.id,
        was_valid: historyWasValid,
        status_code: statusCode,
        message: classification.message.slice(0, 500),
      });
    if (historyError) {
      counts.errors += 1;
      console.error("Failed to store internship validation history", {
        internshipId: internship.id,
        error: historyError,
      });
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  return json({
    success: counts.errors === 0,
    validated: internships?.length ?? 0,
    ...counts,
  }, counts.errors === 0 ? 200 : 207);
});
