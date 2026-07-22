import { useState } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, ShieldCheck } from "lucide-react";
import { useAdminAuth } from "@/auth/admin-auth-state";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AdminAuthLoading() {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-muted/30 p-6"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
        <img
          src="/raidermatch-logo.png"
          alt=""
          className="h-9 w-9 animate-pulse rounded-xl"
        />
        Verifying your admin session…
      </div>
    </div>
  );
}

function AdminUnauthorized() {
  const { signOut } = useAdminAuth();
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSwitchAccount = async () => {
    setIsSigningOut(true);
    setError(null);
    try {
      const warning = await signOut();
      navigate("/admin/login", {
        replace: true,
        state: warning ? { message: warning } : undefined,
      });
    } catch {
      setError("We could not sign out this account. Please try again.");
      setIsSigningOut(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-lg card-shadow">
        <CardHeader>
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <CardTitle>Admin access required</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This account is signed in, but it does not have the RaiderMatch admin role.
          </p>
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Sign-out failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={() => navigate("/", { replace: true })}>
              Return to RaiderMatch
            </Button>
            <Button
              variant="outline"
              onClick={handleSwitchAccount}
              disabled={isSigningOut}
            >
              {isSigningOut ? "Signing out…" : "Use another account"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

export function ProtectedAdminRoute() {
  const { loading, session, isAdmin, error } = useAdminAuth();
  const location = useLocation();

  if (loading) return <AdminAuthLoading />;

  if (!session) {
    const intendedPath = `${location.pathname}${location.search}${location.hash}`;
    return (
      <Navigate
        to="/admin/login"
        replace
        state={{ from: intendedPath, message: error }}
      />
    );
  }

  if (!isAdmin) return <AdminUnauthorized />;

  return <Outlet />;
}
