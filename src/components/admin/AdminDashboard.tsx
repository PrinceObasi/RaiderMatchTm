import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, LogOut, ShieldCheck } from "lucide-react";
import { useAdminAuth } from "@/auth/admin-auth-state";
import { AnalyticsDashboard } from "@/components/AnalyticsDashboard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function AdminDashboard() {
  const { session, signOut } = useAdminAuth();
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const handleLogout = async () => {
    setIsSigningOut(true);
    setLogoutError(null);
    try {
      const warning = await signOut();
      navigate("/admin/login", {
        replace: true,
        state: warning ? { message: warning } : undefined,
      });
    } catch {
      setLogoutError("We could not sign you out. Please try again.");
      setIsSigningOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex min-h-16 items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-semibold">RaiderMatch Admin</h1>
              <p className="max-w-[55vw] truncate text-xs text-muted-foreground">
                {session?.user.email ?? "Authenticated administrator"}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={handleLogout}
            disabled={isSigningOut}
          >
            <LogOut className="h-4 w-4" />
            {isSigningOut ? "Signing out…" : "Sign out"}
          </Button>
        </div>
      </header>

      {logoutError && (
        <div className="container mx-auto px-4 pt-6 sm:px-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Sign-out failed</AlertTitle>
            <AlertDescription>{logoutError}</AlertDescription>
          </Alert>
        </div>
      )}

      <main className="container mx-auto">
        <AnalyticsDashboard scope="admin" />
      </main>
    </div>
  );
}
