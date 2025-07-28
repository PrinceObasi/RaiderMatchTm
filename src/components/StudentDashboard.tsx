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
  ClipboardList
} from "lucide-react";

interface Job {
  id: string;
  title: string;
  company: string;
  city: string;
  hireScore: number;
  description: string;
  skills: string[];
}

interface StudentDashboardProps {
  onLogout: () => void;
}

export function StudentDashboard({ onLogout }: StudentDashboardProps) {
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isMatching, setIsMatching] = useState(false);
  const [matches, setMatches] = useState<Job[]>([]);
  const [hasResume, setHasResume] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const { toast } = useToast();

  // Load user profile
  useEffect(() => {
    const loadProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile, error } = await supabase
          .from('students')
          .select('*')
          .eq('user_id', session.user.id)
          .single();
        
        if (error) {
          console.error('Error loading profile:', error);
        } else {
          setProfile(profile);
          setHasResume(!!profile.resume_url);
        }
      }
    };
    
    loadProfile();
  }, []);

  const studentName = profile?.name || "Student";
  const studentGPA = profile?.graduation_year ? `Class of ${profile.graduation_year}` : "TTU Student";

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

      setHasResume(true);
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
    if (!hasResume) {
      toast({
        title: "Upload resume first",
        description: "Please upload your resume to get matches.",
        variant: "destructive"
      });
      return;
    }

    setIsMatching(true);

    try {
      const { data, error } = await supabase.functions.invoke('match');

      if (error) throw error;

      setMatches(data.jobs || []);
      toast({
        title: "Matches found!",
        description: `Found ${data.jobs?.length || 0} perfect internship matches for you.`,
      });
    } catch (error) {
      console.error('Matching error:', error);
      toast({
        title: "Matching failed",
        description: "Failed to find matches. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsMatching(false);
    }
  };

  const handleApply = async (jobId: string, company: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      await supabase.from('applications').insert({
        user_id: session.user.id,
        job_id: jobId
      });

      toast({
        title: "Application submitted!",
        description: `Your application to ${company} has been recorded. They'll see your HireScore and may invite you for an interview.`,
      });
    } catch (error) {
      console.error('Application error:', error);
      toast({
        title: "Application failed",
        description: "Failed to submit application. Please try again.",
        variant: "destructive"
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
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Target className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-xl font-bold">Student Dashboard</h1>
              <p className="text-sm text-muted-foreground">Welcome back, {studentName}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <Badge variant="secondary" className="text-sm">
              GPA: {studentGPA}
            </Badge>
            <Button variant="ghost" onClick={onLogout} size="sm">
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Resume Upload Section */}
          <div className="lg:col-span-1">
            <Card className="card-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Resume
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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

                {hasResume && (
                  <div className="flex items-center gap-2 text-sm text-success">
                    <FileText className="h-4 w-4" />
                    Resume uploaded and analyzed
                  </div>
                )}

                <Button 
                  onClick={handleRefreshMatches}
                  disabled={!hasResume || isMatching}
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
              </CardContent>
            </Card>
          </div>

          {/* Main Content with Tabs */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="matches" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="matches" className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Matches ({matches.length})
                </TabsTrigger>
                <TabsTrigger value="applications" className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" />
                  My Applications
                </TabsTrigger>
              </TabsList>
              
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
                      <div className="space-y-4">
                        {matches.map((job) => (
                          <Card key={job.id} className="border hover:shadow-md transition-smooth">
                            <CardContent className="p-6">
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                  <h3 className="text-lg font-semibold mb-1">{job.title}</h3>
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
                                <div className="text-right">
                                  <div className="text-2xl font-bold text-primary mb-1">
                                    {job.hireScore}
                                  </div>
                                  <Badge 
                                    className={`${getScoreColor(job.hireScore)} text-white`}
                                  >
                                    HireScore
                                  </Badge>
                                </div>
                              </div>
                              
                              <p className="text-muted-foreground mb-4">{job.description}</p>
                              
                              <Button 
                                onClick={() => handleApply(job.id, job.company)}
                                className="w-full"
                                size="lg"
                              >
                                <ExternalLink className="h-4 w-4" />
                                Apply Now
                              </Button>
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
    </div>
  );
}