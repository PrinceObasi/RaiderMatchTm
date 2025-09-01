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

const queryClient = new QueryClient();

type UserType = 'student' | 'employer' | null;

const App = () => {
  const [user, setUser] = useState<UserType>(null);
  const [currentView, setCurrentView] = useState<'main' | 'settings' | 'admin'>('main');
  const [authModal, setAuthModal] = useState<{
    isOpen: boolean;
    defaultTab: 'student' | 'employer' | 'login';
  }>({
    isOpen: false,
    defaultTab: 'login'
  });

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

  const handleLogout = () => {
    setUser(null);
    setCurrentView('main');
  };

  const handleAccountDeleted = () => {
    setUser(null);
    setCurrentView('main');
  };

  // Check for admin access via URL hash
  useEffect(() => {
    const checkAdminAccess = () => {
      if (window.location.hash === '#admin') {
        setCurrentView('admin');
        // Clear the hash to avoid bookmarking
        window.history.replaceState(null, '', window.location.pathname);
      }
    };

    checkAdminAccess();
    window.addEventListener('hashchange', checkAdminAccess);
    
    return () => window.removeEventListener('hashchange', checkAdminAccess);
  }, []);

  const renderCurrentView = () => {
    if (currentView === 'admin') {
      return (
        <AdminImport 
          onBack={() => setCurrentView('main')}
        />
      );
    }

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
          <AuthBootstrapper />
          
          {renderCurrentView()}
          
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
