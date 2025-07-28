import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { isTTUEmail } from "@/lib/validators";
import { supabase } from "@/integrations/supabase/client";
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
  const { toast } = useToast();

  const isStudentInvalidEmail = email.length > 0 && !isTTUEmail(email);
  const isStudentDisabled =
    isLoading || !firstName || !lastName || !password || isStudentInvalidEmail;

  if (!isOpen) return null;

  const handleSubmit = async (type: 'login' | 'student' | 'employer') => {
    if (!email || !password) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
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

    if (type === 'student' && !isTTUEmail(email)) {
      toast({
        title: "Invalid email",
        description: "Only @ttu.edu addresses are allowed for students.",
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

    if (type === 'login') {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      setIsLoading(false);
      if (error) {
        toast({ title: 'Login failed', description: error.message, variant: 'destructive' });
        return;
      }
      onSuccess(data.user.user_metadata.role || (email.includes('@ttu.edu') ? 'student' : 'employer'));
      toast({ title: 'Welcome back!', description: "You've been successfully signed in." });
      onClose();
    } else {
      const userMetadata = type === 'student'
        ? { first_name: firstName, last_name: lastName, role: 'student' }
        : { company, role: 'employer' };
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { 
          data: userMetadata,
          emailRedirectTo: `${window.location.origin}/`
        }
      });
      
      if (error) {
        setIsLoading(false);
        toast({ title: 'Sign-up failed', description: error.message, variant: 'destructive' });
        return;
      }

      // Insert student record for student users
      if (type === 'student' && data.user) {
        const { error: insertError } = await supabase
          .from('students')
          .insert({
            user_id: data.user.id,
            email: data.user.email,
            name: `${firstName} ${lastName}`,
            resume_url: null,
            skills: []
          });
        
        if (insertError) {
          setIsLoading(false);
          toast({ title: 'Profile creation failed', description: insertError.message, variant: 'destructive' });
          return;
        }
      }
      
      setIsLoading(false);
      onSuccess(type);
      toast({ title: 'Account created!', description: "You're now signed in." });
      onClose();
    }
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
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="pl-10"
                  />
                </div>
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
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex.rodriguez@ttu.edu"
                    className="pl-10"
                  />
                </div>
                {isStudentInvalidEmail && (
                  <p className="text-sm text-red-500 mt-1">
                    Please use your TTU email address.
                  </p>
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
                disabled={isStudentDisabled}
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
                <Label htmlFor="employer-email">Work Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="employer-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="recruiter@company.com"
                    className="pl-10"
                  />
                </div>
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