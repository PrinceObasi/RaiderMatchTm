import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AuthBootstrapperProps {
  onAuthStateChange: (userType: 'student' | 'employer' | null) => void;
}

export function AuthBootstrapper({ onAuthStateChange }: AuthBootstrapperProps) {
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Check for existing session first
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (mounted) {
          if (session?.user && !error) {
            const role = session.user.user_metadata?.role ?? 'student';
            onAuthStateChange(role as 'student' | 'employer');
          } else {
            onAuthStateChange(null);
          }
        }
      } catch (error) {
        console.error('Error checking session:', error);
        if (mounted) {
          onAuthStateChange(null);
        }
      }
    };

    // Initialize auth state
    initializeAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      console.log('Auth state changed:', event, session?.user?.id);

      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
        const role = session.user.user_metadata?.role ?? 'student';
        onAuthStateChange(role as 'student' | 'employer');
      } else if (event === 'SIGNED_OUT' || !session) {
        onAuthStateChange(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [onAuthStateChange]);

  return null;
}