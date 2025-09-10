import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AuthBootstrapperProps {
  onAuthStateChange: (userType: 'student' | 'employer' | null) => void;
}

export function AuthBootstrapper({ onAuthStateChange }: AuthBootstrapperProps) {
  useEffect(() => {
    // Check for existing session first
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const role = session.user.user_metadata?.role ?? 'student';
        onAuthStateChange(role as 'student' | 'employer');
      } else {
        onAuthStateChange(null);
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const role = session.user.user_metadata?.role ?? 'student';
        onAuthStateChange(role as 'student' | 'employer');
      } else if (event === 'SIGNED_OUT') {
        onAuthStateChange(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [onAuthStateChange]);

  return null;
}