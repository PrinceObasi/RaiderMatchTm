
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { X, Mail, Lock, User, Building } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'student' | 'employer' | 'login';
  onSuccess: (userType: 'student' | 'employer') => void;
}

export function AuthModal({ isOpen, onClose, defaultTab = 'login', onSuccess }: AuthModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [company, setCompany] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const { toast } = useToast();

  if (!isOpen) return null;

  const validateTTUEmail = (email: string) => {
    if (!email.endsWith('@ttu.edu')) {
      setEmailError('Please use your TTU email');
      return false;
    }
    setEmailError('');
    return true;
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    if (emailError && newEmail.endsWith('@ttu.edu')) {
      setEmailError('');
    }
  };

  const handleSubmit = async (type: 'login' | 'student' | 'employer') => {
    if (!email || !password) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    if (!validateTTUEmail(email)) {
      return;
    }

    if (type === 'student' && (!firstName || !lastName)) {
      toast({
        title: "Missing information", 
        description: "Please provide your first and last name.",
        variant: "destructive"
      });
      return;
    }

    if (type === 'employer' && !company) {
      toast({
        title: "Missing information",
        description: "Please provide your company name.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      
      if (type === 'login') {
        // Simulate determining user type from login
        const userType = email.includes('employer') ? 'employer' : 'student';
        onSuccess(userType);
      } else {
        onSuccess(type as 'student' | 'employer');
      }
      
      toast({
        title: type === 'login' ? "Welcome back!" : "Account created!",
        description: type === 'login' 
          ? "You've been successfully signed in." 
          : "Your account has been created and you're now signed in.",
      });
      
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md card-shadow relative">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute right-2 top-2 z-10"
        >
          <X className="h-4 w-4" />
        </Button>

        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold">
            Welcome to RaiderMatch
          </CardTitle>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="student">Student</TabsTrigger>
              <TabsTrigger value="employer">Employer</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4 mt-6">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={handleEmailChange}
                    placeholder="your@ttu.edu"
                    className="pl-10"
                  />
                </div>
                {emailError && (
                  <p className="text-sm text-destructive">{emailError}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your password"
                    className="pl-10"
                  />
                </div>
              </div>

              <Button 
                onClick={() => handleSubmit('login')}
                disabled={isLoading}
                className="w-full"
                size="lg"
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </TabsContent>

            <TabsContent value="student" className="space-y-4 mt-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="student-firstname">First Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="student-firstname"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Alex"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="student-lastname">Last Name</Label>
                  <Input
                    id="student-lastname"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Rodriguez"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="student-email">TTU Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="student-email"
                    type="email"
                    value={email}
                    onChange={handleEmailChange}
                    placeholder="alex.rodriguez@ttu.edu"
                    className="pl-10"
                  />
                </div>
                {emailError && (
                  <p className="text-sm text-destructive">{emailError}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="student-password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="student-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a password"
                    className="pl-10"
                  />
                </div>
              </div>

              <Button 
                onClick={() => handleSubmit('student')}
                disabled={isLoading}
                className="w-full"
                size="lg"
              >
                {isLoading ? "Creating account..." : "Create Student Account"}
              </Button>
            </TabsContent>

            <TabsContent value="employer" className="space-y-4 mt-6">
              <div className="space-y-2">
                <Label htmlFor="employer-company">Company Name</Label>
                <div className="relative">
                  <Building className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="employer-company"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Dell Technologies"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="employer-email">TTU Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="employer-email"
                    type="email"
                    value={email}
                    onChange={handleEmailChange}
                    placeholder="recruiter@ttu.edu"
                    className="pl-10"
                  />
                </div>
                {emailError && (
                  <p className="text-sm text-destructive">{emailError}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="employer-password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="employer-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a password"
                    className="pl-10"
                  />
                </div>
              </div>

              <Button 
                onClick={() => handleSubmit('employer')}
                disabled={isLoading}
                className="w-full"
                size="lg"
              >
                {isLoading ? "Creating account..." : "Create Employer Account"}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
