import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function AuthBootstrapper() {
  useEffect(() => {
    // Simple auth state listener - no need to manually create profiles
    // The database trigger handles student profile creation automatically
    const sub = supabase.auth.onAuthStateChange(() => {
      // Just listen for auth changes, trigger handles the rest
    });

    return () => sub.data.subscription.unsubscribe();
  }, []);

  return null;
}