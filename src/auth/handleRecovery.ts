import { supabase } from "@/integrations/supabase/client";

export interface RecoveryResult {
  isRecovery: boolean;
  error?: string;
}

export async function handleRecovery(): Promise<RecoveryResult> {
  const url = new URL(window.location.href);
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  
  // Check if this is a recovery flow - look for any recovery indicators
  const typeInQuery = url.searchParams.get('type') === 'recovery';
  const typeInHash = hashParams.get('type') === 'recovery';
  const codeInQuery = url.searchParams.get('code');
  const codeInHash = hashParams.get('code');
  const accessTokenInQuery = url.searchParams.get('access_token');
  const accessTokenInHash = hashParams.get('access_token');
  
  const isRecovery = typeInQuery || typeInHash || codeInQuery || codeInHash || accessTokenInQuery || accessTokenInHash;
  
  if (!isRecovery) return { isRecovery: false };

  try {
    // 1) Handle PKCE-style code exchange from either query or hash
    const code = codeInQuery || codeInHash;
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

    // 2) Handle hash-style or query-style tokens
    if (!code) {
      const access_token = accessTokenInQuery || accessTokenInHash;
      const refresh_token = url.searchParams.get('refresh_token') || hashParams.get('refresh_token');
      
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
