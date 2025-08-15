import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ensureStudentProfile } from "@/lib/ensureProfile";

export function AuthBootstrapper() {
  useEffect(() => {
    const sub = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "SIGNED_IN") await ensureStudentProfile();
    });

    ensureStudentProfile(); // handle refresh with existing session

    return () => sub.data.subscription.unsubscribe();
  }, []);

  return null;
}