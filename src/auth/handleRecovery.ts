import { supabase } from "@/integrations/supabase/client";

export interface RecoveryResult {
  isRecovery: boolean;
  error?: string;
}

export async function handleRecovery(): Promise<RecoveryResult> {
  const url = window.location.href;
  const params = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  
  // Check if this is a recovery flow
  const type = hashParams.get('type') || params.get('type');
  const code = hashParams.get('code') || params.get('code');
  const accessToken = hashParams.get('access_token') || params.get('access_token');
  const refreshToken = hashParams.get('refresh_token') || params.get('refresh_token');
  
  if (type !== 'recovery' && !code && !accessToken) {
    return { isRecovery: false };
  }

  try {
    // Handle PKCE-style code exchange
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(url);
      if (error) {
        console.error('Code exchange error:', error);
        return { 
          isRecovery: true, 
          error: 'This reset link is invalid or expired. Please request a new one.' 
        };
      }
    }
    // Handle hash-style tokens  
    else if (accessToken && refreshToken) {
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      });
      if (error) {
        console.error('Session set error:', error);
        return { 
          isRecovery: true, 
          error: 'This reset link is invalid or expired. Please request a new one.' 
        };
      }
    }

    // Clean the URL of sensitive tokens while keeping the recovery flag
    const cleanUrl = `${window.location.origin}/?type=recovery`;
    window.history.replaceState(null, '', cleanUrl);

    return { isRecovery: true };
  } catch (error) {
    console.error('Recovery handling error:', error);
    return { 
      isRecovery: true, 
      error: 'This reset link is invalid or expired. Please request a new one.' 
    };
  }
}

export function cleanRecoveryUrl(): void {
  window.history.replaceState(null, '', window.location.origin + '/');
}
