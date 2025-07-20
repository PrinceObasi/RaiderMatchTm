import { Button } from "@/components/ui/button";
import { GraduationCap, LogIn, UserPlus } from "lucide-react";

interface HeaderProps {
  onStudentSignup: () => void;
  onEmployerSignup: () => void;
  onLogin: () => void;
}

export function Header({ onStudentSignup, onEmployerSignup, onLogin }: HeaderProps) {
  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <GraduationCap className="h-8 w-8 text-primary" />
          <span className="text-2xl font-bold text-primary">RaiderMatch</span>
        </div>
        
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={onLogin} className="flex items-center gap-2">
            <LogIn className="h-4 w-4" />
            Sign In
          </Button>
          <Button variant="outline" onClick={onEmployerSignup} className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Employer
          </Button>
          <Button variant="hero" size="lg" onClick={onStudentSignup} className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            Get Started
          </Button>
        </div>
      </div>
    </header>
  );
}