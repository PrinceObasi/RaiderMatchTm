import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ApplicationList } from "./ApplicationList";
import { ProfileWizard } from "./ProfileWizard";
import { ApplicationSchema } from "@/lib/schemas";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Upload, 
  RefreshCw, 
  FileText, 
  MapPin, 
  Building, 
  Target,
  ExternalLink,
  User,
  LogOut,
  ClipboardList,
  Info,
  Settings2
} from "lucide-react";
import { renderSafeHTML } from "@/lib/sanitize";

interface Job {
  id: string;
  title: string;
  company: string;
  city: string;
  hireScore: number;
  description: string;
  skills: string[];
  apply_url: string;
  explanationLines: string[];
}

interface StudentDashboardProps {
  onLogout: () => void;
  onOpenSettings: () => void;
}

export function StudentDashboard({ onLogout, onOpenSettings }: StudentDashboardProps) {
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isMatching, setIsMatching] = useState(false);
  const [matches, setMatches] = useState<Job[]>([]);
  const [student, setStudent] = useState<any>(null);
  const [resumeAnalyzed, setResumeAnalyzed] = useState(false);
  const [showProfileWizard, setShowProfileWizard] = useState(false);
  const { toast } = useToast();

  // Auto-load matches function
  const loadMatches = async (studentData?: any, forceLoad = false) => {
    const currentStudent = studentData || student;
    if (!currentStudent?.id || (!resumeAnalyzed && !forceLoad)) return;
    
    setIsMatching(true);
    try {
      const { data, error } = await supabase.functions.invoke('match');
      if (error) throw error;

      setMatches(data.jobs || []);
      toast({
        title: "Matches loaded!",
        description: `Found ${data.jobs?.length || 0} internship matches for you.`,
      });
    } catch (error) {
      console.error('Matching error:', error);
      toast({
        title: "Matching failed",
        description: "Failed to load matches. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsMatching(false);
    }
  };

  // Initialize profile and auto-load matches
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: s, error } = await supabase
        .from('students')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error) {
        console.error('Error loading profile:', error);
        return;
      }
      
      setStudent(s);
      const hasResumeData = !!(s?.resume_url || (s?.skills?.length ?? 0) > 0);
      setResumeAnalyzed(hasResumeData);
      
      // Auto-load matches if resume is already analyzed
      if (hasResumeData) {
        await loadMatches(s, true);
      }
    };
    
    init();
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      init();
    });
    
    return () => subscription?.unsubscribe();
  }, []);

  const studentName = student?.name || "Student";
  const studentGPA = student?.graduation_year ? `Class of ${student.graduation_year}` : "TTU Student";

  const handleResumeUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || file.type !== 'application/pdf') {
      toast({
        title: "Invalid file",
        description: "Please upload a PDF file.",
        variant: "destructive"
      });
      return;
    }

    setResumeFile(file);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const { data, error } = await supabase.functions.invoke('upload-resume', {
        body: formData
      });

      if (error) throw error;

      // Update states and reload student data
      setResumeAnalyzed(true);
      
      // Reload student data to get updated skills/resume_url
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: updatedStudent } = await supabase
          .from('students')
          .select('*')
          .eq('user_id', user.id)
          .single();
        setStudent(updatedStudent);
        
        // Auto-load matches after successful upload
        await loadMatches(updatedStudent);
      }

      toast({
        title: "Resume uploaded successfully!",
        description: `Found ${data.skills?.length || 0} skills. Your resume has been analyzed and stored.`,
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload and analyze resume. Please try again.",
        variant: "destructive"
      });
      setResumeFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRefreshMatches = async () => {
    if (!resumeAnalyzed) {
      toast({
        title: "Upload resume first",
        description: "Please upload your resume to get matches.",
        variant: "destructive"
      });
      return;
    }

    await loadMatches();
  };

  const handleApply = async (jobId: string, applyUrl: string, hireScore?: number) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    // 1️⃣ Open the external page immediately (within the user gesture)
    if (applyUrl?.startsWith('https://')) {
      window.open(applyUrl, '_blank', 'noopener,noreferrer');
    } else {
      toast({
        title: 'Missing application link',
        description: 'The employer did not provide a valid URL.',
        variant: 'destructive'
      });
      return;
    }

    // 2️⃣ Use Edge Function to record application with rate limiting
    try {
      const { data, error } = await supabase.functions.invoke('apply', {
        body: {
          job_id: jobId,
          hire_score: hireScore,
          apply_url: applyUrl
        }
      });

      if (error) {
        // Handle rate limiting
        if (error.message?.includes('Rate limit')) {
          toast({
            title: 'Too many applications',
            description: 'Please wait a minute before applying to more jobs.',
            variant: 'destructive'
          });
        } else if (error.message?.includes('Already applied')) {
          toast({
            title: 'Already applied',
            description: 'You\'ve already applied to this job.',
            variant: 'destructive'
          });
        } else {
          toast({
            title: 'Application failed',
            description: error.message || 'Failed to record application',
            variant: 'destructive'
          });
        }
        return;
      }

      toast({ 
        title: 'Application logged', 
        description: 'Good luck!' 
      });
    } catch (error) {
      console.error('Application error:', error);
      toast({
        title: 'Application failed',
        description: 'Failed to record application. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "bg-green-500";
    if (score >= 80) return "bg-yellow-500";
    return "bg-blue-500";
  };

  return (
      <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Target className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-xl font-bold">Student Dashboard</h1>
              <p className="text-sm text-muted-foreground">Welcome back, {studentName}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <Badge variant="secondary" className="hidden sm:inline-flex text-xs sm:text-sm">
              GPA: {studentGPA}
            </Badge>
            <Button variant="ghost" onClick={onOpenSettings} size="sm" className="text-xs sm:text-sm">
              <Settings2 className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Settings</span>
            </Button>
            <Button variant="ghost" onClick={onLogout} size="sm" className="text-xs sm:text-sm">
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[360px,1fr] gap-4 sm:gap-6">
          {/* Resume Upload Section */}
          <div className="lg:col-span-1">
            <Card className="card-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Resume
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-4">
                <div>
                  <Label htmlFor="resume">Upload Resume (PDF)</Label>
                  <Input
                    id="resume"
                    type="file"
                    accept=".pdf"
                    onChange={handleResumeUpload}
                    disabled={isUploading}
                    className="mt-1"
                  />
                </div>

                {isUploading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Analyzing resume...
                  </div>
                )}

                {resumeAnalyzed && (
                  <div className="flex items-center gap-2 text-sm text-success">
                    <FileText className="h-4 w-4" />
                    Resume uploaded and analyzed
                  </div>
                )}

                <div className="space-y-2">
                  <Button 
                    onClick={handleRefreshMatches}
                    disabled={!resumeAnalyzed || isMatching}
                    className="w-full"
                    size="lg"
                  >
                    {isMatching ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Finding Matches...
                      </>
                    ) : (
                      <>
                        <Target className="h-4 w-4" />
                        Refresh Matches
                      </>
                    )}
                  </Button>
                  
                  <Button 
                    onClick={() => setShowProfileWizard(true)}
                    variant="outline"
                    className="w-full"
                    size="sm"
                  >
                    <User className="h-4 w-4" />
                    Complete Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content with Tabs */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="matches" className="w-full">
              <div className="flex gap-2 overflow-x-auto sm:overflow-visible px-1">
                <TabsList className="flex shrink-0 gap-2">
                  <TabsTrigger value="matches" className="shrink-0 flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Matches ({matches.length})
                  </TabsTrigger>
                  <TabsTrigger value="applications" className="shrink-0 flex items-center gap-2">
                    <ClipboardList className="h-4 w-4" />
                    My Applications
                  </TabsTrigger>
                </TabsList>
              </div>
              
              <TabsContent value="matches" className="mt-6">
                <Card className="card-shadow">
                  <CardContent className="pt-6">
                    {matches.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg mb-2">No matches yet</p>
                        <p>Upload your resume and click "Refresh Matches" to find perfect internships!</p>
                      </div>
                    ) : (
                      <div className="space-y-4 sm:space-y-6">
                        {matches.map((job) => (
                           <Card key={job.id} className="border hover:shadow-md transition-smooth">
                              <CardContent className="p-4 sm:p-6">
                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                                  <div className="flex-1">
                                    <h3 className="text-lg sm:text-xl font-semibold leading-tight mb-1">{job.title}</h3>
                                   <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                     <div className="flex items-center gap-1">
                                       <Building className="h-4 w-4" />
                                       {job.company}
                                     </div>
                                     <div className="flex items-center gap-1">
                                       <MapPin className="h-4 w-4" />
                                       {job.city}
                                     </div>
                                   </div>
                                 </div>
                                 <div className="flex items-center gap-4 sm:flex-col sm:text-right">
                                   <div className="flex items-center gap-2">
                                     <div className="text-2xl font-bold text-primary">
                                       {job.hireScore}
                                     </div>
                                     <Badge 
                                       className={`${getScoreColor(job.hireScore)} text-white`}
                                     >
                                       HireScore
                                     </Badge>
                                   </div>
                                   <Popover>
                                     <PopoverTrigger className="inline-flex items-center gap-1 text-sm text-muted-foreground underline-offset-2 hover:underline">
                                       Why this score?
                                     </PopoverTrigger>
                                     <PopoverContent className="w-72 sm:w-96 text-sm">
                                       <ul className="list-disc pl-4 space-y-1">
                                         {job.explanationLines.map((line, i) => (
                                           <li key={i}>{line}</li>
                                         ))}
                                       </ul>
                                     </PopoverContent>
                                   </Popover>
                                 </div>
                               </div>
                              
                                {(() => {
                                  const safeHTML = renderSafeHTML(job.description);
                                  return safeHTML ? (
                                    <p 
                                      className="mt-2 text-sm sm:text-base text-muted-foreground line-clamp-3 sm:line-clamp-none mb-4"
                                      dangerouslySetInnerHTML={safeHTML}
                                    />
                                  ) : (
                                    <p className="mt-2 text-sm sm:text-base text-muted-foreground line-clamp-3 sm:line-clamp-none mb-4">{job.description}</p>
                                  );
                                })()}
                               
                                <div className="mt-4">
                                  <Button 
                                    onClick={() => handleApply(job.id, job.apply_url, job.hireScore)}
                                    className="w-full sm:w-auto h-11"
                                    size="lg"
                                  >
                                   <ExternalLink className="h-4 w-4" />
                                   Apply Now
                                 </Button>
                                </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="applications" className="mt-6">
                <Card className="card-shadow">
                  <CardContent className="pt-6">
                    <ApplicationList />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      <ProfileWizard 
        isOpen={showProfileWizard}
        onClose={() => setShowProfileWizard(false)}
        userId={student?.user_id || ''}
        onComplete={() => {
          // Reload student profile after completion
          const loadProfile = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
              const { data: updatedStudent } = await supabase
                .from('students')
                .select('*')
                .eq('user_id', session.user.id)
                .single();
              setStudent(updatedStudent);
            }
          };
          loadProfile();
        }}
      />
    </div>
  );
}