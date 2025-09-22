import { supabase } from "@/integrations/supabase/client";

export interface RecoveryResult {
  isRecovery: boolean;
  error?: string;
}

export async function handleRecovery(): Promise<RecoveryResult> {
  const url = new URL(window.location.href);
  const isRecovery = url.searchParams.get('type') === 'recovery';

  if (!isRecovery) return { isRecovery: false };

  try {
    // 1) PKCE-style links: /?type=recovery&code=...
    const code = url.searchParams.get('code');
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
      if (error) {
        console.error('Code exchange error:', error);
        return { 
          isRecovery: true, 
          error: 'This reset link is invalid or expired. Please request a new one.' 
        };
      }
    }

    // 2) Hash-style links: /?type=recovery#access_token=...&refresh_token=...
    if (!code && window.location.hash.includes('access_token')) {
      const hash = new URLSearchParams(window.location.hash.substring(1));
      const access_token = hash.get('access_token');
      const refresh_token = hash.get('refresh_token');
      if (access_token && refresh_token) {
        const { error } = await supabase.auth.setSession({ access_token, refresh_token });
        if (error) {
          console.error('Session set error:', error);
          return { 
            isRecovery: true, 
            error: 'This reset link is invalid or expired. Please request a new one.' 
          };
        }
      }
    }

    // Scrub tokens from the URL but keep the flag so UI knows to show the form
    window.history.replaceState(null, '', `${window.location.origin}/?type=recovery`);
    return { isRecovery: true };
  } catch (error) {
    console.error('Recovery handling error:', error);
    return { 
      isRecovery: true, 
      error: 'This reset link is invalid or expired. Please request a new one.' 
    };
  }
}
