import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  AdminAuthContext,
  hasAdminRole,
  type AdminAuthContextValue,
  type AdminAuthSnapshot,
} from "./admin-auth-state";

const SESSION_ERROR_MESSAGE =
  "Your session expired or could not be restored. Please sign in again.";

const signedOutSnapshot: AdminAuthSnapshot = {
  session: null,
  isAdmin: false,
  error: null,
};

async function clearLocalSession() {
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // The provider still clears its state below. Supabase also removes invalid
    // persisted sessions when refresh-token recovery fails.
  }
}

async function getVerifiedSnapshot(
  suppliedSession?: Session,
): Promise<AdminAuthSnapshot> {
  let session = suppliedSession;

  if (!session) {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      return { ...signedOutSnapshot, error: SESSION_ERROR_MESSAGE };
    }
    session = data.session ?? undefined;
  }

  if (!session) return signedOutSnapshot;

  const { data, error } = await supabase.auth.getUser(session.access_token);
  if (error || !data.user) {
    return { ...signedOutSnapshot, error: SESSION_ERROR_MESSAGE };
  }

  return {
    session: { ...session, user: data.user },
    isAdmin: hasAdminRole(data.user),
    error: null,
  };
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<AdminAuthSnapshot>(signedOutSnapshot);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);
  const initializing = useRef(true);
  const authGeneration = useRef(0);
  const latestSession = useRef<Session | null>(null);

  const refreshSession = useCallback(async (session?: Session) => {
    const generation = ++authGeneration.current;
    setLoading(true);
    let nextSnapshot: AdminAuthSnapshot;
    try {
      nextSnapshot = await getVerifiedSnapshot(session);
    } catch {
      nextSnapshot = { ...signedOutSnapshot, error: SESSION_ERROR_MESSAGE };
    }

    if (!mounted.current || generation !== authGeneration.current) {
      return nextSnapshot;
    }

    if (nextSnapshot.error) {
      await clearLocalSession();
      if (mounted.current && latestSession.current === null) {
        setSnapshot(nextSnapshot);
        setLoading(false);
      }
      return nextSnapshot;
    }

    if (mounted.current && generation === authGeneration.current) {
      latestSession.current = nextSnapshot.session;
      setSnapshot(nextSnapshot);
      setLoading(false);
    }
    return nextSnapshot;
  }, []);

  const signOut = useCallback(async () => {
    authGeneration.current += 1;
    latestSession.current = null;
    setLoading(true);
    let remoteSignOutFailed = false;
    try {
      const { error } = await supabase.auth.signOut();
      remoteSignOutFailed = Boolean(error);
    } catch {
      remoteSignOutFailed = true;
    }

    if (remoteSignOutFailed) {
      await clearLocalSession();
    }

    if (mounted.current) {
      setSnapshot(signedOutSnapshot);
      setLoading(false);
    }

    return remoteSignOutFailed
      ? "You were signed out on this device, but we could not close other active sessions."
      : null;
  }, []);

  useEffect(() => {
    mounted.current = true;

    void refreshSession().finally(() => {
      initializing.current = false;
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted.current) return;
        if (event === "INITIAL_SESSION" && initializing.current) return;

        authGeneration.current += 1;
        latestSession.current = session;

        if (event === "SIGNED_OUT" || !session) {
          setSnapshot(signedOutSnapshot);
          setLoading(false);
          return;
        }

        if (
          event === "SIGNED_IN" || event === "TOKEN_REFRESHED" ||
          event === "USER_UPDATED"
        ) {
          setSnapshot({
            session,
            isAdmin: hasAdminRole(session.user),
            error: null,
          });
          setLoading(false);
        }
      },
    );

    return () => {
      mounted.current = false;
      authGeneration.current += 1;
      subscription.unsubscribe();
    };
  }, [refreshSession]);

  const value = useMemo<AdminAuthContextValue>(() => ({
    ...snapshot,
    loading,
    refreshSession,
    signOut,
  }), [loading, refreshSession, signOut, snapshot]);

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}
