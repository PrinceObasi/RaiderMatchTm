import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Analytics } from "@vercel/analytics/react";
import { LandingPage } from "./components/LandingPage";
import { StudentDashboard } from "./components/StudentDashboard";
import { EmployerDashboard } from "./components/EmployerDashboard";
import { AuthModal } from "./components/AuthModal";
import { Settings } from "./components/Settings";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AdminAuthProvider } from "@/auth/AdminAuthContext";
import { AdminRoutes } from "@/components/admin/AdminRoutes";
import { Button } from "@/components/ui/button";

const queryClient = new QueryClient();

type UserType = 'student' | 'employer' | 'pendingEmployer' | 'admin' | null;

function getUserType(session: Session | null): UserType {
  if (!session) return null;
  const trustedRole = session.user.app_metadata?.role;
  if (trustedRole === 'admin') return 'admin';
  if (trustedRole === 'employer') return 'employer';
  if (session.user.user_metadata?.role === 'employer') return 'pendingEmployer';
  return 'student';
}

export const MainApplication = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [currentView, setCurrentView] = useState<'main' | 'settings'>('main');
  const [authModal, setAuthModal] = useState<{
    isOpen: boolean;
    defaultTab: 'student' | 'employer' | 'login';
  }>({
    isOpen: false,
    defaultTab: 'login'
  });

  useEffect(() => {
    let isMounted = true;

    void supabase.auth.getSession()
      .then(({ data, error }) => {
        if (!isMounted) return;
        setSession(error ? null : data.session);
        setIsAuthReady(true);
      })
      .catch(() => {
        if (!isMounted) return;
        setSession(null);
        setIsAuthReady(true);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      setSession(session);
      setIsAuthReady(true);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const user = getUserType(session);

  useEffect(() => {
    setCurrentView('main');
  }, [session?.user.id]);

  const handleStudentSignup = () => {
    setAuthModal({ isOpen: true, defaultTab: 'student' });
  };

  const handleEmployerSignup = () => {
    setAuthModal({ isOpen: true, defaultTab: 'employer' });
  };

  const handleLogin = () => {
    setAuthModal({ isOpen: true, defaultTab: 'login' });
  };

  const handleAuthSuccess = (session: Session) => {
    setSession(session);
    setAuthModal({ isOpen: false, defaultTab: 'login' });
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) await supabase.auth.signOut({ scope: 'local' });
    } catch {
      await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
    } finally {
      setSession(null);
      setCurrentView('main');
    }
  };

  const handleAccountDeleted = () => {
    setSession(null);
    setCurrentView('main');
  };

  const renderCurrentView = () => {
    if (!isAuthReady) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-muted/30" role="status" aria-live="polite">
          <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
            <img src="/raidermatch-logo.png" alt="" className="h-9 w-9 rounded-xl" />
            Loading RaiderMatch…
          </div>
        </div>
      );
    }

    if (currentView === 'settings' && (user === 'student' || user === 'employer')) {
      return (
        <Settings 
          userType={user} 
          onAccountDeleted={handleAccountDeleted}
        />
      );
    }

    if (user === 'student') {
      return (
        <StudentDashboard
          key={session?.user.id}
          onLogout={handleLogout} 
          onOpenSettings={() => setCurrentView('settings')}
        />
      );
    }
    
    if (user === 'employer') {
      return (
        <EmployerDashboard
          key={session?.user.id}
          onLogout={handleLogout}
          onOpenSettings={() => setCurrentView('settings')}
        />
      );
    }

    if (user === 'admin') {
      return <Navigate to="/admin/dashboard" replace />;
    }

    if (user === 'pendingEmployer') {
      return (
        <main className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
          <div className="w-full max-w-lg rounded-xl border bg-card p-6 text-card-foreground card-shadow">
            <h1 className="text-xl font-semibold">Employer approval pending</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              An administrator must approve this employer account before it can access employer tools.
            </p>
            <Button variant="outline" className="mt-5" onClick={handleLogout}>
              Sign out
            </Button>
          </div>
        </main>
      );
    }

    return (
      <LandingPage
        onStudentSignup={handleStudentSignup}
        onEmployerSignup={handleEmployerSignup}
        onLogin={handleLogin}
      />
    );
  };

  return (
    <>
      {renderCurrentView()}

      <AuthModal
        isOpen={authModal.isOpen}
        onClose={() => setAuthModal({ ...authModal, isOpen: false })}
        defaultTab={authModal.defaultTab}
        onSuccess={handleAuthSuccess}
      />
    </>
  );
};

export function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/admin/*"
        element={
          <AdminAuthProvider>
            <AdminRoutes />
          </AdminAuthProvider>
        }
      />
      <Route path="*" element={<MainApplication />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <div className="min-h-screen overflow-x-hidden bg-background pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
          <Toaster />
          <Sonner />
          <AppRoutes />
          <Analytics />
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
