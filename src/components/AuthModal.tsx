import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { isTTUEmail, validatePassword } from "@/lib/validators";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";
import { supabase } from "@/integrations/supabase/client";
import { StudentCreateSchema } from "@/lib/schemas";
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
  const [isInternational, setIsInternational] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const { toast } = useToast();

  // Password validation
  const passwordValidation = validatePassword(password);
  
  const isStudentInvalidEmail = email.length > 0 && !isTTUEmail(email);
  const isStudentDisabled =
    isLoading || !firstName || !lastName || !password || !passwordValidation.isValid || isStudentInvalidEmail;
  const isEmployerDisabled = 
    isLoading || !company || !email || !password || !passwordValidation.isValid;

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

    // Password validation for signup only (not login)
    if (type !== 'login' && !passwordValidation.isValid) {
      toast({
        title: "Password requirements not met",
        description: "Please ensure your password meets all the security requirements.",
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
        if (error.message.includes('Invalid login credentials')) {
          toast({ 
            title: 'Login failed', 
            description: 'Invalid email or password. Click "Forgot Password?" below to reset your password.', 
            variant: 'destructive' 
          });
        } else {
          toast({ title: 'Login failed', description: error.message, variant: 'destructive' });
        }
        return;
      }
      const role = data.user.user_metadata?.role ?? 'student';
      onSuccess(role as 'student' | 'employer');
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
      
      setIsLoading(false);
      if (error) {
        if (error.message.includes('User already registered')) {
          toast({ 
            title: 'Account exists', 
            description: 'An account with this email already exists. Please use the "Sign In" tab or reset your password if needed.', 
            variant: 'destructive' 
          });
        } else {
          toast({ title: 'Sign-up failed', description: error.message, variant: 'destructive' });
        }
        return;
      }

      // Insert student record for student users
      if (type === 'student' && data.user) {
        const user = data.user;
        
        // Check if we have a valid session after signup
        let currentSession = data.session;
        if (!currentSession) {
          // If no session from signup (user already exists), try to sign in
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password
          });
          
          if (signInError) {
            toast({ 
              title: 'Account exists but login failed', 
              description: 'Your account exists but we could not sign you in. Please use the "Sign In" tab or reset your password.', 
              variant: 'destructive' 
            });
            return;
          }
          
          currentSession = signInData.session;
        }
        
        // Only proceed if we have a valid session
        if (currentSession) {
          // Check if student profile already exists
          const { data: existingStudent } = await supabase
            .from('students')
            .select('id')
            .eq('user_id', user.id)
            .single();
            
          // Only create profile if it doesn't exist
          if (!existingStudent) {
            // Validate and create student profile
            const profileData = {
              user_id: user.id,
              name: `${firstName} ${lastName}`,
              email: user.email!,
              resume_url: '',
              skills: [],
              is_international: isInternational
            };

            // Validate data before inserting
            StudentCreateSchema.parse(profileData);

            const { error: insertError } = await supabase
              .from('students')
              .insert(profileData);
            
            if (insertError) {
              toast({ title: 'Profile creation failed', description: insertError.message, variant: 'destructive' });
              return;
            }
          }
        }
      }
      
      onSuccess(type);
      toast({ title: 'Account created!', description: "You're now signed in." });
      onClose();
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter your email address first.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/`
    });
    setIsLoading(false);

    if (error) {
      toast({ 
        title: 'Password reset failed', 
        description: error.message, 
        variant: 'destructive' 
      });
    } else {
      toast({ 
        title: 'Password reset sent', 
        description: 'Check your email for password reset instructions.' 
      });
      setShowPasswordReset(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-sm sm:max-w-md mx-4 my-6 card-shadow relative">
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
            Welcome to RaiderMatch<span className="align-super text-[0.6em] ml-0.5">™</span>
          </CardTitle>
        </CardHeader>

        <CardContent className="p-4 sm:p-6">
          <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 text-xs sm:text-sm">
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
                className="w-full sm:w-auto"
                size="lg"
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>

              <div className="text-center">
                <Button
                  variant="link"
                  onClick={() => setShowPasswordReset(true)}
                  className="text-sm text-muted-foreground"
                >
                  Forgot Password?
                </Button>
              </div>

              {showPasswordReset && (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                  <div className="text-sm text-muted-foreground">
                    Enter your email address and we'll send you a password reset link.
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handlePasswordReset}
                      disabled={isLoading}
                      size="sm"
                    >
                      {isLoading ? "Sending..." : "Send Reset Email"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowPasswordReset(false)}
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
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
                <PasswordStrengthIndicator 
                  password={password} 
                  validation={passwordValidation}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="intl"
                  checked={isInternational}
                  onCheckedChange={(checked) => setIsInternational(checked === true)}
                />
                <Label htmlFor="intl" className="text-sm">
                  I'm an international student
                </Label>
              </div>

              <Button 
                onClick={() => handleSubmit('student')}
                disabled={isStudentDisabled}
                className="w-full sm:w-auto"
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
                <PasswordStrengthIndicator 
                  password={password} 
                  validation={passwordValidation}
                />
              </div>

              <Button 
                onClick={() => handleSubmit('employer')}
                disabled={isEmployerDisabled}
                className="w-full sm:w-auto"
                size="lg"
              >
                {isLoading ? "Creating account..." : "Create Employer Account"}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
        </Card>
      </div>
    </div>
  );
}