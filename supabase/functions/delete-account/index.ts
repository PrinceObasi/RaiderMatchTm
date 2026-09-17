import { createClient } from "npm:@supabase/supabase-js@2.116.0";
import { bearerToken } from "../_shared/edge-input.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const STORAGE_PAGE_SIZE = 100;
const STORAGE_DELETE_BATCH_SIZE = 100;

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
    return json({ error: "Method not allowed" }, 405);
  }

  const token = bearerToken(req.headers.get("authorization"));
  if (!token) return json({ error: "Unauthorized" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Account deletion service is not configured");
    return json({ error: "Service unavailable" }, 503);
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) return json({ error: "Unauthorized" }, 401);

    const bucket = supabaseAdmin.storage.from("resumes");
    const collectResumePaths = async (
      prefix: string,
      depth = 0,
    ): Promise<string[]> => {
      if (depth > 32) {
        throw new Error("Resume storage nesting exceeds the deletion limit");
      }

      const paths: string[] = [];
      let offset = 0;
      while (true) {
        const { data: entries, error: listError } = await bucket.list(prefix, {
          limit: STORAGE_PAGE_SIZE,
          offset,
          sortBy: { column: "name", order: "asc" },
        });
        if (listError) throw listError;

        for (const entry of entries ?? []) {
          if (!entry.name) continue;

          const path = `${prefix}/${entry.name}`;
          const isFolder = entry.id == null && entry.metadata == null;
          if (isFolder) {
            paths.push(...await collectResumePaths(path, depth + 1));
          } else {
            paths.push(path);
          }
        }

        if (!entries || entries.length < STORAGE_PAGE_SIZE) break;
        offset += entries.length;
      }
      return paths;
    };

    let resumePaths: string[];
    try {
      resumePaths = await collectResumePaths(user.id);
    } catch (listError) {
      console.error("Resume storage listing failed:", String(listError));
      return json({ error: "Failed to delete resume files" }, 500);
    }

    for (
      let index = 0;
      index < resumePaths.length;
      index += STORAGE_DELETE_BATCH_SIZE
    ) {
      const paths = resumePaths.slice(index, index + STORAGE_DELETE_BATCH_SIZE);
      const { error: removeError } = await bucket.remove(paths);
      if (removeError) {
        console.error("Resume storage cleanup failed:", removeError.message);
        return json({ error: "Failed to delete resume files" }, 500);
      }
    }

    // The database determines which records belong to the authenticated user.
    // Client-supplied role or account-type claims are deliberately ignored.
    const { error: cleanupError } = await supabaseAdmin.rpc(
      "delete_user_data",
      { p_user_id: user.id },
    );
    if (cleanupError) {
      console.error("Database account cleanup failed:", cleanupError.code);
      return json({ error: "Failed to delete account data" }, 500);
    }

    const { error: deleteUserError } = await supabaseAdmin.auth.admin
      .deleteUser(
        user.id,
      );
    if (deleteUserError) {
      console.error("Auth account deletion failed:", deleteUserError.message);
      return json({ error: "Failed to delete account" }, 500);
    }

    return json({ success: true, message: "Account deleted successfully" });
  } catch (error) {
    console.error("Account deletion failed:", String(error));
    return json({ error: "Failed to delete account" }, 500);
  }
});
