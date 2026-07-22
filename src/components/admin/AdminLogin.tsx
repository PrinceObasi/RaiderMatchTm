import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, Lock, Mail, ShieldCheck } from "lucide-react";
import { useAdminAuth } from "@/auth/admin-auth-state";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdminAuthLoading } from "./ProtectedAdminRoute";

interface AdminLocationState {
  from?: string;
  message?: string | null;
}

function getSafeAdminDestination(from?: string) {
  if (
    !from || !from.startsWith("/admin/") || from.startsWith("//") ||
    from.startsWith("/admin/login")
  ) {
    return "/admin/dashboard";
  }
  return from;
}

export function AdminLogin() {
  const { loading, session, isAdmin, error: sessionError, refreshSession } =
    useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = (location.state ?? {}) as AdminLocationState;
  const destination = useMemo(
    () => getSafeAdminDestination(locationState.from),
    [locationState.from],
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && session && isAdmin) {
      navigate(destination, { replace: true });
    }
  }, [destination, isAdmin, loading, navigate, session]);

  if (loading || (session && isAdmin)) return <AdminAuthLoading />;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginError(null);

    if (!email.trim() || !password) {
      setLoginError("Enter your admin email and password.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error || !data.session) {
        setLoginError("The email or password is incorrect. Please try again.");
        return;
      }

      const verified = await refreshSession(data.session);
      if (verified.error) {
        setLoginError(verified.error);
        return;
      }

      if (!verified.isAdmin) {
        setLoginError(
          "This account is valid, but it is not authorized for admin access.",
        );
        return;
      }

      navigate(destination, { replace: true });
    } catch {
      setLoginError("We could not sign you in. Check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const visibleMessage = loginError ?? sessionError ?? locationState.message;

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4 sm:p-6">
      <Card className="w-full max-w-md card-shadow">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <div className="space-y-2">
            <CardTitle>RaiderMatch Admin</CardTitle>
            <CardDescription>
              Sign in with an account that has the server-managed admin role.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            {visibleMessage && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Unable to continue</AlertTitle>
                <AlertDescription>{visibleMessage}</AlertDescription>
              </Alert>
            )}

            {session && !isAdmin && !loginError && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Different account required</AlertTitle>
                <AlertDescription>
                  The active account is not an admin. Signing in below will switch accounts.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="admin-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="admin-email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="admin@example.com"
                  className="pl-10"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="admin-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="pl-10"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <Button type="submit" className="h-11 w-full" disabled={isSubmitting}>
              {isSubmitting ? "Verifying access…" : "Sign in to admin"}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => navigate("/", { replace: true })}
              disabled={isSubmitting}
            >
              Return to RaiderMatch
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
