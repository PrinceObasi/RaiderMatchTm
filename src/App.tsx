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
import { AuthBootstrapper } from "./components/AuthBootstrapper";
import { AdminImport } from "./components/AdminImport";
import EnrichAdminPage from "./pages/admin/enrich";
import { ResetPassword } from "./components/auth/ResetPassword";
import { TriggerScraper } from "./components/TriggerScraper";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { handleRecovery } from "./auth/handleRecovery";

const queryClient = new QueryClient();

type UserType = 'student' | 'employer' | null;

const App = () => {
  const [user, setUser] = useState<UserType>(null);
  const [currentView, setCurrentView] = useState<'main' | 'settings' | 'admin' | 'enrich' | 'reset-password' | 'scraper'>('main');
  const [recoveryError, setRecoveryError] = useState<string | undefined>();
  const [authModal, setAuthModal] = useState<{
    isOpen: boolean;
    defaultTab: 'student' | 'employer' | 'login';
  }>({
    isOpen: false,
    defaultTab: 'login'
  });
  const { toast } = useToast();

  const handleStudentSignup = () => {
    setAuthModal({ isOpen: true, defaultTab: 'student' });
  };

  const handleEmployerSignup = () => {
    setAuthModal({ isOpen: true, defaultTab: 'employer' });
  };

  const handleLogin = () => {
    setAuthModal({ isOpen: true, defaultTab: 'login' });
  };

  const handleAuthStateChange = (userType: UserType) => {
    setUser(userType);
    if (userType) {
      setAuthModal({ isOpen: false, defaultTab: 'login' });
    }
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

  // Check for admin access via URL hash and handle password reset routing
  useEffect(() => {
    const checkRouting = async () => {
      if (window.location.hash === '#admin') {
        setCurrentView('admin');
        // Clear the hash to avoid bookmarking
        window.history.replaceState(null, '', window.location.pathname);
      } else if (window.location.hash === '#enrich') {
        setCurrentView('enrich');
        // Clear the hash to avoid bookmarking
        window.history.replaceState(null, '', window.location.pathname);
      } else if (window.location.hash === '#scraper') {
        setCurrentView('scraper');
        // Clear the hash to avoid bookmarking
        window.history.replaceState(null, '', window.location.pathname);
      } else {
        // Handle recovery flow
        try {
          const result = await handleRecovery();
          if (result.isRecovery) {
            setCurrentView('reset-password');
            setRecoveryError(result.error);
          }
        } catch (error) {
          console.error('Recovery check failed:', error);
        }
      }
    };

    checkRouting();
    window.addEventListener('hashchange', checkRouting);
    
    return () => window.removeEventListener('hashchange', checkRouting);
  }, []);

  const renderCurrentView = () => {
    if (currentView === 'reset-password') {
      return (
        <ResetPassword 
          onSuccess={() => {
            setCurrentView('main');
            setAuthModal({ isOpen: true, defaultTab: 'login' });
          }}
          onRequestNewLink={() => {
            setCurrentView('main');
            setAuthModal({ isOpen: true, defaultTab: 'login' });
          }}
          error={recoveryError}
        />
      );
    }

    if (currentView === 'admin') {
      return (
        <AdminImport 
          onBack={() => setCurrentView('main')}
        />
      );
    }

    if (currentView === 'enrich') {
      return (
        <EnrichAdminPage 
          onBack={() => setCurrentView('main')}
        />
      );
    }

    if (currentView === 'scraper') {
      return (
        <TriggerScraper onBack={() => setCurrentView('main')} />
      );
    }

    if (currentView === 'settings' && user) {
      return (
        <Settings 
          userType={user} 
          onAccountDeleted={handleAccountDeleted}
          onBack={() => setCurrentView('main')}
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
          <AuthBootstrapper onAuthStateChange={handleAuthStateChange} />
          
          {renderCurrentView()}
          
          <AuthModal
            isOpen={authModal.isOpen}
            onClose={() => setAuthModal({ ...authModal, isOpen: false })}
            defaultTab={authModal.defaultTab}
          />
          <Analytics />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
