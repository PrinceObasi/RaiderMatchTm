// Backlog compatibility endpoint. New syncs call enrich-internship directly with inserted IDs.
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

const MAX_BATCH_SIZE = 15;
const DEFAULT_BATCH_SIZE = 10;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const requestedLimit = body.limit == null
      ? DEFAULT_BATCH_SIZE
      : Number(body.limit);
    if (!Number.isInteger(requestedLimit) || requestedLimit < 1) {
      return json(
        { ok: false, reason: "limit must be a positive integer" },
        400,
      );
    }
    const limit = Math.min(requestedLimit, MAX_BATCH_SIZE);
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: internships, error } = await supabase
      .rpc("get_internships_needing_enrichment", { p_limit: limit });
    if (error) {
      return json({
        ok: false,
        reason: "Failed to fetch enrichment candidates",
      }, 500);
    }

    const ids = (internships ?? [])
      .map((internship: { id?: unknown }) => internship.id)
      .filter((id: unknown): id is string => typeof id === "string")
      .slice(0, limit);
    if (ids.length === 0) return json({ ok: true, status: "idle", queued: 0 });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    let response: Response;
    try {
      response = await fetch(
        `${supabaseUrl}/functions/v1/enrich-internship`,
        {
          method: "POST",
          headers: serviceRoleHeaders(serviceRoleKey),
          body: JSON.stringify({ ids }),
          signal: controller.signal,
        },
      );
    } finally {
      clearTimeout(timer);
    }
    if (!response.ok) {
      console.error("Batch worker dispatch failed with HTTP", response.status);
      return json({
        ok: false,
        reason: `Batch worker returned HTTP ${response.status}`,
      }, 502);
    }

    const result = await response.json() as { queued?: number };
    return json({
      ok: true,
      status: "queued",
      queued: result.queued ?? ids.length,
    }, 202);
  } catch (error) {
    console.error("Backlog enrichment dispatch failed:", String(error));
    return json({ ok: false, reason: "Internal server error" }, 500);
  }
});
