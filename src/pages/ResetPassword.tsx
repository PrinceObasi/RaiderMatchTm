import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { validatePassword } from "@/lib/validators";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";

interface ResetPasswordProps {
  onNavigateToLogin: () => void;
}

export const ResetPassword = ({ onNavigateToLogin }: ResetPasswordProps) => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [validatingToken, setValidatingToken] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const { toast } = useToast();

  // Password validation
  const passwordValidation = validatePassword(password);

  useEffect(() => {
    validateResetToken();
  }, []);

  const validateResetToken = async () => {
    try {
      setValidatingToken(true);
      
      // Get URL parameters from both query string and hash
      const params = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      
      // Supabase typically sends params in the hash fragment
      const type = hashParams.get('type') || params.get('type');
      const accessToken = hashParams.get('access_token') || params.get('access_token');
      const refreshToken = hashParams.get('refresh_token') || params.get('refresh_token');
      const error = hashParams.get('error') || params.get('error');
      const errorDescription = hashParams.get('error_description') || params.get('error_description');

      // Check for errors first
      if (error) {
        console.error('Auth error:', error, errorDescription);
        
        let userMessage = 'Invalid or expired reset link.';
        
        if (error === 'access_denied') {
          userMessage = 'Access denied. The reset link may be invalid or expired.';
        } else if (errorDescription?.includes('expired')) {
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

        setTokenValid(false);
        setValidatingToken(false);
        return;
      }

      // Validate we have the required reset token
      if (type !== 'recovery' || !accessToken) {
        toast({
          title: "Invalid access",
          description: "No valid reset token found. Please use the link from your email.",
          variant: "destructive"
        });
        setTokenValid(false);
        setValidatingToken(false);
        return;
      }

      // Validate the session with Supabase
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

        setTokenValid(false);
      } else if (data.session) {
        // Token is valid
        setTokenValid(true);
        
        // Clean up URL after successful validation
        window.history.replaceState(null, '', '/reset-password');
      }
    } catch (err) {
      console.error('Error validating reset token:', err);
      toast({
        title: "Validation failed",
        description: "An error occurred while validating your reset link.",
        variant: "destructive"
      });
      setTokenValid(false);
    } finally {
      setValidatingToken(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: "Password mismatch",
        description: "Passwords do not match.",
        variant: "destructive"
      });
      return;
    }

    if (!passwordValidation.isValid) {
      toast({
        title: "Password requirements not met",
        description: "Please ensure your password meets all the security requirements.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        let errorMessage = 'Failed to update password.';
        if (error.message.includes('expired')) {
          errorMessage = 'Your session has expired. Please request a new password reset.';
        } else if (error.message.includes('same')) {
          errorMessage = 'New password must be different from your current password.';
        } else if (error.message) {
          errorMessage = error.message;
        }

        toast({
          title: "Password update failed",
          description: errorMessage,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Password updated",
          description: "Your password has been successfully updated. You can now log in.",
          variant: "default"
        });

        // Sign out to ensure clean state
        await supabase.auth.signOut();

        // Navigate back to login after a short delay
        setTimeout(() => {
          onNavigateToLogin();
        }, 2000);
      }
    } catch (err) {
      console.error('Error updating password:', err);
      toast({
        title: "Update failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (validatingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Validating reset link...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invalid Reset Link</CardTitle>
            <CardDescription>
              This password reset link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Please request a new password reset link to continue.
            </p>
            <Button onClick={onNavigateToLogin} className="w-full">
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Set New Password</CardTitle>
          <CardDescription>
            Enter your new password below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
              <PasswordStrengthIndicator 
                password={password} 
                validation={passwordValidation}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading || !password || !confirmPassword || !passwordValidation.isValid}
            >
              {loading ? "Updating..." : "Update Password"}
            </Button>

            <Button 
              type="button" 
              variant="outline" 
              className="w-full"
              onClick={onNavigateToLogin}
              disabled={loading}
            >
              Back to Login
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};