import { createClient } from "@supabase/supabase-js";
import {
  extractTextFromPDF,
  parseResumeSkills,
  ResumeParseError,
} from "./resume-parser.ts";
import { validateResumeUpload } from "./resume-upload-validation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authorization } } },
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return jsonResponse({ error: "No file provided" }, 400);
    }

    const validationError = validateResumeUpload(file);
    if (validationError) {
      return jsonResponse({ error: validationError }, 400);
    }

    const arrayBuffer = await file.arrayBuffer();
    const extractedText = await extractTextFromPDF(arrayBuffer);
    const skills = parseResumeSkills(extractedText);

    const fileName = `${user.id}/resume.pdf`;
    const { error: uploadError } = await supabase.storage
      .from("resumes")
      .upload(fileName, arrayBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return jsonResponse({ error: "Failed to upload resume" }, 500);
    }

    const { error: updateError } = await supabase
      .from("students")
      .update({
        skills,
        resume_path: fileName,
        resume_uploaded: true,
        resume_url: null,
      })
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Update error:", updateError);
      return jsonResponse({ error: "Failed to update student profile" }, 500);
    }

    return jsonResponse({
      success: true,
      skills,
      resume_path: fileName,
      resumePath: fileName,
      message: "Resume uploaded and parsed successfully",
    }, 200);
  } catch (error) {
    if (error instanceof ResumeParseError) {
      return jsonResponse({ error: error.message, code: error.code }, 422);
    }

    console.error("Error:", error);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
