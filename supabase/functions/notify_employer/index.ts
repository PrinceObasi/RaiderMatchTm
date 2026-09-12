import { isServiceRoleRequest } from "../_shared/service-role.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve((req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const hasExactServiceRoleBearer = req.headers.get("authorization") ===
    `Bearer ${serviceRoleKey}`;
  if (
    !hasExactServiceRoleBearer ||
    !isServiceRoleRequest(req, serviceRoleKey)
  ) {
    return json({ error: "Unauthorized" }, 401);
  }

  return json({
    error: "Gone",
    message:
      "Employer email notifications are retired pending a reviewed, durable outbox workflow.",
  }, 410);
});
