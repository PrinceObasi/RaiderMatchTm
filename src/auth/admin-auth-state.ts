import { createContext, useContext } from "react";
import type { Session, User } from "@supabase/supabase-js";

export interface AdminAuthSnapshot {
  session: Session | null;
  isAdmin: boolean;
  error: string | null;
}

export interface AdminAuthContextValue extends AdminAuthSnapshot {
  loading: boolean;
  refreshSession: (session?: Session) => Promise<AdminAuthSnapshot>;
  signOut: () => Promise<string | null>;
}

export const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function hasAdminRole(user: Pick<User, "app_metadata"> | null | undefined) {
  return user?.app_metadata?.role === "admin";
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error("useAdminAuth must be used within AdminAuthProvider");
  }
  return context;
}
