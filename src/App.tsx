import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LandingPage } from "./components/LandingPage";
import { StudentDashboard } from "./components/StudentDashboard";
import { EmployerDashboard } from "./components/EmployerDashboard";
import { AuthModal } from "./components/AuthModal";

const queryClient = new QueryClient();

type UserType = 'student' | 'employer' | null;

const App = () => {
  const [user, setUser] = useState<UserType>(null);
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
  };

  const renderCurrentView = () => {
    if (user === 'student') {
      return <StudentDashboard onLogout={handleLogout} />;
    }
    
    if (user === 'employer') {
      return <EmployerDashboard onLogout={handleLogout} />;
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
        <Toaster />
        <Sonner />
        
        {renderCurrentView()}
        
        <AuthModal
          isOpen={authModal.isOpen}
          onClose={() => setAuthModal({ ...authModal, isOpen: false })}
          defaultTab={authModal.defaultTab}
          onSuccess={handleAuthSuccess}
        />
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
