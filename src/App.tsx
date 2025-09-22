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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const queryClient = new QueryClient();

type UserType = 'student' | 'employer' | null;

const App = () => {
  const [user, setUser] = useState<UserType>(null);
  const [currentView, setCurrentView] = useState<'main' | 'settings' | 'admin' | 'enrich'>('main');
  const [authModal, setAuthModal] = useState<{
    isOpen: boolean;
    defaultTab: 'student' | 'employer' | 'login' | 'reset-password';
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

  // Check for admin access via URL hash and handle password reset
  useEffect(() => {
    const checkAdminAccess = () => {
      if (window.location.hash === '#admin') {
        setCurrentView('admin');
        // Clear the hash to avoid bookmarking
        window.history.replaceState(null, '', window.location.pathname);
      } else if (window.location.hash === '#enrich') {
        setCurrentView('enrich');
        // Clear the hash to avoid bookmarking
        window.history.replaceState(null, '', window.location.pathname);
      }
    };

    const handlePasswordReset = async () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const type = hashParams.get('type');
      const error = hashParams.get('error');
      const errorCode = hashParams.get('error_code');

      if (error && errorCode === 'otp_expired') {
        toast({
          title: "Reset link expired",
          description: "The password reset link has expired. Please request a new one.",
          variant: "destructive"
        });
        // Clean up URL
        window.history.replaceState(null, '', window.location.pathname);
        return;
      }

      if (type === 'recovery' && accessToken && refreshToken) {
        try {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (!error) {
            setAuthModal({ isOpen: true, defaultTab: 'reset-password' });
            // Clean up URL
            window.history.replaceState(null, '', window.location.pathname);
          } else {
            toast({
              title: "Reset link invalid",
              description: "The password reset link is invalid or has expired. Please request a new one.",
              variant: "destructive"
            });
          }
        } catch (err) {
          toast({
            title: "Reset failed",
            description: "Failed to process password reset. Please try again.",
            variant: "destructive"
          });
        }
      }
    };

    checkAdminAccess();
    handlePasswordReset();
    window.addEventListener('hashchange', checkAdminAccess);
    
    return () => window.removeEventListener('hashchange', checkAdminAccess);
  }, [toast]);

  const renderCurrentView = () => {
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
