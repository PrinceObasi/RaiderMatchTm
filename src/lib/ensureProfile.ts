import { supabase } from "@/integrations/supabase/client";

export async function ensureStudentProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: existing } = await supabase
    .from("students")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existing) {
    const meta = user.user_metadata || {};
    const email = user.email;
    if (!email) return;

    const name =
      [meta.first_name, meta.last_name].filter(Boolean).join(" ") ||
      email.split("@")[0] ||
      "Student";
    
    await supabase.from("students").insert({
      user_id: user.id,
      name,
      email,
      is_international: !!meta.is_international
    });
  }
}
