import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Settings2, Trash2, AlertTriangle, Shield, ArrowLeft, Key, Briefcase, Save } from "lucide-react";
import { ChangePasswordForm } from "@/components/auth/ChangePasswordForm";

interface SettingsProps {
  userType: 'student' | 'employer';
  onAccountDeleted: () => void;
  onBack: () => void;
}

interface MatchPreferences {
  preferred_roles: string[];
  preferred_work_mode: string;
  preferred_company_stages: string[];
  tech_interests: string[];
  work_authorization: string;
}

export function Settings({ userType, onAccountDeleted, onBack }: SettingsProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(true);
  const [studentId, setStudentId] = useState<string | null>(null);
  
  const [preferences, setPreferences] = useState<MatchPreferences>({
    preferred_roles: [],
    preferred_work_mode: 'no_preference',
    preferred_company_stages: [],
    tech_interests: [],
    work_authorization: 'prefer_not_say'
  });
  
  const { toast } = useToast();

  useEffect(() => {
    if (userType === 'student') {
      loadPreferences();
    }
  }, [userType]);

  const loadPreferences = async () => {
    try {
      // Get student ID first
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (studentError) throw studentError;
      if (!student) return;

      setStudentId(student.id);

      // Load preferences
      const { data, error } = await supabase
        .from('student_preferences' as any)
        .select('*')
        .eq('student_id', student.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const prefs = data as any;
        setPreferences({
          preferred_roles: prefs.preferred_roles || [],
          preferred_work_mode: prefs.preferred_work_mode || 'no_preference',
          preferred_company_stages: prefs.preferred_company_stages || [],
          tech_interests: prefs.tech_interests || [],
          work_authorization: prefs.work_authorization || 'prefer_not_say'
        });
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setIsLoadingPreferences(false);
    }
  };

  const handleSavePreferences = async () => {
    if (!studentId) {
      toast({
        title: "Error",
        description: "Student profile not found. Please try logging in again.",
        variant: "destructive"
      });
      return;
    }

    setIsSavingPreferences(true);
    try {
      const { error } = await supabase
        .from('student_preferences' as any)
        .upsert({
          student_id: studentId,
          ...preferences,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: "Preferences saved",
        description: "Your match preferences have been updated successfully.",
      });
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: "Failed to save",
        description: "Could not save your preferences. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSavingPreferences(false);
    }
  };

  const toggleArrayValue = (array: string[], value: string) => {
    if (array.includes(value)) {
      return array.filter(item => item !== value);
    } else {
      return [...array, value];
    }
  };


  const handleDeleteAccount = async () => {
    if (confirmText !== 'DELETE ACCOUNT') {
      toast({
        title: "Confirmation required",
        description: "Please type 'DELETE ACCOUNT' to confirm.",
        variant: "destructive"
      });
      return;
    }

    setIsDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-account', {
        body: { userType }
      });

      if (error) throw error;

      toast({
        title: "Account deleted",
        description: "Your account and all associated data have been permanently deleted.",
      });

      // Sign out and redirect
      await supabase.auth.signOut();
      onAccountDeleted();
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Deletion failed",
        description: "Failed to delete your account. Please try again or contact support.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
      setConfirmText('');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-6 h-16 flex items-center">
          <Button
            variant="ghost"
            onClick={onBack}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center space-x-4">
            <Settings2 className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-xl font-bold">Account Settings</h1>
              <p className="text-sm text-muted-foreground">Manage your account and data</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8 max-w-4xl">
        <div className="space-y-8">
          {/* Account Security */}
          <Card className="card-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Account Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <p className="text-sm text-muted-foreground">
                  Your email address is managed through your authentication provider.
                  To change it, please contact support.
                </p>
              </div>
              
              <Collapsible open={showChangePassword} onOpenChange={setShowChangePassword}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>Password</Label>
                      <p className="text-sm text-muted-foreground">
                        Update your password to keep your account secure
                      </p>
                    </div>
                    <CollapsibleTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Key className="h-4 w-4 mr-2" />
                        {showChangePassword ? 'Cancel' : 'Change Password'}
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                  
                  <CollapsibleContent className="pt-4 border-t">
                    <ChangePasswordForm
                      onSuccess={() => setShowChangePassword(false)}
                      onCancel={() => setShowChangePassword(false)}
                    />
                  </CollapsibleContent>
                </div>
              </Collapsible>
            </CardContent>
          </Card>

          {/* Match Preferences - Only show for students */}
          {userType === 'student' && (
            <Card className="card-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Match Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {isLoadingPreferences ? (
                  <div className="text-sm text-muted-foreground">Loading preferences...</div>
                ) : (
                  <>
                    {/* Preferred Roles */}
                    <div className="space-y-3">
                      <Label>Preferred Roles</Label>
                      <div className="grid grid-cols-2 gap-3">
                        {['Backend', 'Frontend', 'Full-stack', 'Mobile', 'Data / ML', 'Systems / Infrastructure'].map((role) => (
                          <div key={role} className="flex items-center space-x-2">
                            <Checkbox
                              id={`role-${role}`}
                              checked={preferences.preferred_roles.includes(role)}
                              onCheckedChange={() => {
                                setPreferences({
                                  ...preferences,
                                  preferred_roles: toggleArrayValue(preferences.preferred_roles, role)
                                });
                              }}
                            />
                            <label
                              htmlFor={`role-${role}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                              {role}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Work Mode */}
                    <div className="space-y-3">
                      <Label>Work Mode</Label>
                      <RadioGroup
                        value={preferences.preferred_work_mode}
                        onValueChange={(value) => {
                          setPreferences({
                            ...preferences,
                            preferred_work_mode: value
                          });
                        }}
                      >
                        {['onsite', 'hybrid', 'remote', 'no_preference'].map((mode) => (
                          <div key={mode} className="flex items-center space-x-2">
                            <RadioGroupItem value={mode} id={`work-mode-${mode}`} />
                            <label
                              htmlFor={`work-mode-${mode}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer capitalize"
                            >
                              {mode.replace('_', ' ')}
                            </label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>

                    {/* Company Stage */}
                    <div className="space-y-3">
                      <Label>Company Stage</Label>
                      <div className="space-y-3">
                        {[
                          { value: 'startup', label: 'Startup (0-200 employees)' },
                          { value: 'growth', label: 'Growth (200-2000 employees)' },
                          { value: 'large', label: 'Large / Big Tech (2000+ employees)' }
                        ].map((stage) => (
                          <div key={stage.value} className="flex items-center space-x-2">
                            <Checkbox
                              id={`stage-${stage.value}`}
                              checked={preferences.preferred_company_stages.includes(stage.value)}
                              onCheckedChange={() => {
                                setPreferences({
                                  ...preferences,
                                  preferred_company_stages: toggleArrayValue(preferences.preferred_company_stages, stage.value)
                                });
                              }}
                            />
                            <label
                              htmlFor={`stage-${stage.value}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                              {stage.label}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Tech Interests */}
                    <div className="space-y-3">
                      <Label>Tech Interests</Label>
                      <div className="grid grid-cols-2 gap-3">
                        {['Web / React', 'Backend / APIs', 'Cloud / DevOps', 'AI / ML', 'Systems / C++', 'Mobile (iOS/Android)'].map((tech) => (
                          <div key={tech} className="flex items-center space-x-2">
                            <Checkbox
                              id={`tech-${tech}`}
                              checked={preferences.tech_interests.includes(tech)}
                              onCheckedChange={() => {
                                setPreferences({
                                  ...preferences,
                                  tech_interests: toggleArrayValue(preferences.tech_interests, tech)
                                });
                              }}
                            />
                            <label
                              htmlFor={`tech-${tech}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                              {tech}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Work Authorization */}
                    <div className="space-y-3">
                      <Label>Work Authorization</Label>
                      <RadioGroup
                        value={preferences.work_authorization}
                        onValueChange={(value) => {
                          setPreferences({
                            ...preferences,
                            work_authorization: value
                          });
                        }}
                      >
                        {[
                          { value: 'us_citizen', label: 'US citizen / permanent resident' },
                          { value: 'f1', label: 'F-1 (CPT/OPT)' },
                          { value: 'prefer_not_say', label: 'Other / prefer not to say' }
                        ].map((auth) => (
                          <div key={auth.value} className="flex items-center space-x-2">
                            <RadioGroupItem value={auth.value} id={`auth-${auth.value}`} />
                            <label
                              htmlFor={`auth-${auth.value}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                              {auth.label}
                            </label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>

                    {/* Save Button */}
                    <div className="pt-4 border-t">
                      <Button
                        onClick={handleSavePreferences}
                        disabled={isSavingPreferences}
                        className="w-full sm:w-auto"
                      >
                        {isSavingPreferences ? (
                          <>
                            <Save className="h-4 w-4 animate-pulse" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4" />
                            Save Preferences
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Danger Zone */}
          <Card className="card-shadow border-destructive/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-destructive mb-2">Delete Account</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    Permanently delete your account and all associated data. This action cannot be undone.
                    {userType === 'student' && ' This will remove your profile, applications, and uploaded resume.'}
                    {userType === 'employer' && ' This will remove all your job postings and applicant data.'}
                  </p>
                </div>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full sm:w-auto">
                      <Trash2 className="h-4 w-4" />
                      Delete My Account
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                        Are you absolutely sure?
                      </AlertDialogTitle>
                      <AlertDialogDescription className="space-y-3">
                        <p>
                          This action cannot be undone. This will permanently delete your account
                          and remove all associated data from our servers.
                        </p>
                        <div className="space-y-2">
                          <Label htmlFor="confirm-delete">
                            Type <strong>DELETE ACCOUNT</strong> to confirm:
                          </Label>
                          <Input
                            id="confirm-delete"
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            placeholder="DELETE ACCOUNT"
                            className="font-mono"
                          />
                        </div>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => setConfirmText('')}>
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteAccount}
                        disabled={isDeleting || confirmText !== 'DELETE ACCOUNT'}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {isDeleting ? (
                          <>
                            <Trash2 className="h-4 w-4 animate-pulse" />
                            Deleting...
                          </>
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4" />
                            Delete Account
                          </>
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}