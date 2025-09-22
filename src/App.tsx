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
      try {
        // Get URL parameters from both query string and hash
        const params = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        
        // Supabase typically sends params in the hash fragment
        const type = hashParams.get('type') || params.get('type');
        const accessToken = hashParams.get('access_token') || params.get('access_token');
        const refreshToken = hashParams.get('refresh_token') || params.get('refresh_token');
        const error = hashParams.get('error') || params.get('error');
        const errorCode = hashParams.get('error_code') || params.get('error_code');
        const errorDescription = hashParams.get('error_description') || params.get('error_description');

        // Check for errors first
        if (error) {
          console.error('Auth error:', error, errorDescription);
          
          let userMessage = 'An error occurred during password reset.';
          
          if (error === 'access_denied') {
            userMessage = 'Access denied. The reset link may be invalid or expired.';
          } else if (errorCode === 'otp_expired' || errorDescription?.includes('expired')) {
            userMessage = 'Your password reset link has expired. Please request a new one.';
          } else if (errorDescription?.includes('invalid')) {
            userMessage = 'Invalid reset link. Please request a new password reset.';
          } else if (errorDescription) {
            userMessage = errorDescription;
          }

          toast({
            title: "Reset link error",
            description: userMessage,
            variant: "destructive"
          });

          // Clean up URL
          window.history.replaceState(null, '', window.location.pathname);
          return;
        }

        // Handle password recovery type
        if (type === 'recovery' && accessToken) {
          try {
            // Set the session with the tokens
            const { data, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || ''
            });

            if (sessionError) {
              console.error('Session error:', sessionError);
              
              let errorMessage = 'Failed to validate reset link.';
              if (sessionError.message.includes('expired')) {
                errorMessage = 'Your reset link has expired. Please request a new password reset.';
              } else if (sessionError.message.includes('invalid')) {
                errorMessage = 'Invalid reset link. Please check your email for the correct link.';
              }

              toast({
                title: "Reset link invalid",
                description: errorMessage,
                variant: "destructive"
              });
            } else if (data.session) {
              // Successfully validated the reset token
              setAuthModal({ isOpen: true, defaultTab: 'reset-password' });
              
              // Clean up URL after successful validation
              window.history.replaceState(null, '', window.location.pathname);
            }
          } catch (err) {
            console.error('Unexpected error during session setup:', err);
            toast({
              title: "Reset failed",
              description: "An unexpected error occurred. Please try again or request a new reset link.",
              variant: "destructive"
            });
          }
        } else if (type === 'recovery' && !accessToken) {
          // Recovery type but no token - likely expired or invalid
          toast({
            title: "Reset link invalid",
            description: "Invalid or missing reset token. Please request a new password reset.",
            variant: "destructive"
          });
          window.history.replaceState(null, '', window.location.pathname);
        }
      } catch (err) {
        console.error('Error in handlePasswordReset:', err);
        toast({
          title: "Reset failed",
          description: "An error occurred while processing your reset link.",
          variant: "destructive"
        });
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
