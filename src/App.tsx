import { useState, useEffect } from "react";
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

const queryClient = new QueryClient();

type UserType = 'student' | 'employer' | null;

function getUserType(user: { user_metadata?: Record<string, unknown> } | null): UserType {
  if (!user) return null;
  const role = user.user_metadata?.role;
  if (role === 'student' || role === 'employer') return role;
  return 'student'; // default fallback
}

const App = () => {
  const [user, setUser] = useState<UserType>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'main' | 'settings'>('main');
  const [authModal, setAuthModal] = useState<{
    isOpen: boolean;
    defaultTab: 'student' | 'employer' | 'login';
  }>({
    isOpen: false,
    defaultTab: 'login'
  });

  // Restore session on mount and listen for auth changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(getUserType(session?.user ?? null));
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(getUserType(session?.user ?? null));
      if (!session) {
        setCurrentView('main');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleStudentSignup = () => {
    setAuthModal({ isOpen: true, defaultTab: 'student' });
  };

  const handleEmployerSignup = () => {
    setAuthModal({ isOpen: true, defaultTab: 'employer' });
  };

  const handleLogin = () => {
    setAuthModal({ isOpen: true, defaultTab: 'login' });
  };

  const handleAuthSuccess = (userType: UserType) => {
    setUser(userType);
    setAuthModal({ isOpen: false, defaultTab: 'login' });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setCurrentView('main');
  };

  const handleAccountDeleted = () => {
    setUser(null);
    setCurrentView('main');
  };

  const renderCurrentView = () => {
    if (currentView === 'settings' && user) {
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
          onLogout={handleLogout} 
          onOpenSettings={() => setCurrentView('settings')}
        />
      );
    }
    
    if (user === 'employer') {
      return (
        <EmployerDashboard 
          onLogout={handleLogout}
          onOpenSettings={() => setCurrentView('settings')}
        />
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
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen overflow-x-hidden bg-background pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
          <Toaster />
          <Sonner />

          {isLoading ? (
            <div className="flex items-center justify-center min-h-screen">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : renderCurrentView()}
          
          <AuthModal
            isOpen={authModal.isOpen}
            onClose={() => setAuthModal({ ...authModal, isOpen: false })}
            defaultTab={authModal.defaultTab}
            onSuccess={handleAuthSuccess}
          />
          <Analytics />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
