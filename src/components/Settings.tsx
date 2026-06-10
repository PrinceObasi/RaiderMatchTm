import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Settings2, Download, Trash2, AlertTriangle, FileText, User, Shield } from "lucide-react";

interface SettingsProps {
  userType: 'student' | 'employer';
  onAccountDeleted: () => void;
}

export function Settings({ userType, onAccountDeleted }: SettingsProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const { toast } = useToast();

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Not authenticated');

      // Get user data based on type
      let userData = {};
      
      if (userType === 'student') {
        const { data: studentData } = await supabase
          .from('students')
          .select('*')
          .eq('user_id', session.user.id)
          .single();
        
        const { data: applications } = await supabase
          .from('applications')
          .select(`
            *,
            jobs!job_id (
              title,
              company,
              city
            )
          `)
          .eq('user_id', session.user.id);

        userData = {
          user_info: {
            id: session.user.id,
            email: session.user.email,
            created_at: session.user.created_at
          },
          profile: studentData,
          applications: applications
        };
      } else {
        const { data: jobs } = await supabase
          .from('jobs')
          .select(`
            *,
            applications (
              id,
              user_id,
              status,
              hire_score,
              applied_at
            )
          `)
          .eq('employer_id', session.user.id);

        userData = {
          user_info: {
            id: session.user.id,
            email: session.user.email,
            created_at: session.user.created_at,
            company: session.user.user_metadata?.company
          },
          jobs: jobs
        };
      }

      // Convert to CSV format
      const csvData = JSON.stringify(userData, null, 2);
      const blob = new Blob([csvData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // Download file
      const a = document.createElement('a');
      a.href = url;
      a.download = `user-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Data exported successfully",
        description: "Your data has been downloaded as a JSON file.",
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export failed",
        description: "Failed to export your data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
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
          {/* Data Export Section */}
          <Card className="card-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Export Your Data
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Download a copy of all your data including profile information, 
                {userType === 'student' ? ' applications, and resume data' : ' job postings and applicant information'}.
              </p>
              <Button 
                onClick={handleExportData}
                disabled={isExporting}
                variant="outline"
                className="w-full sm:w-auto"
              >
                {isExporting ? (
                  <>
                    <FileText className="h-4 w-4 animate-pulse" />
                    Preparing Export...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Export Data (JSON)
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

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
              <div className="space-y-2">
                <Label>Password</Label>
                <p className="text-sm text-muted-foreground">
                  Password changes are handled through the authentication system.
                  Use the "Forgot Password" option on the login page.
                </p>
              </div>
            </CardContent>
          </Card>

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