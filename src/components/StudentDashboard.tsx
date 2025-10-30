import { useState, useEffect, useCallback } from "react";
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
import { ProfileTab } from "./profile/ProfileTab";
import { InternshipSearchContainer } from "./search/InternshipSearchContainer";
import { ExampleResumes } from "./ExampleResumes";
import { MyApplications } from "./MyApplications";
import { ApplicationToggle } from "./ApplicationToggle";
import { ApplicationSchema } from "@/lib/schemas";
import { useMatches } from "@/hooks/useMatches";
import { extractKeywords } from "@/lib/extractKeywords";
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
  Settings2,
  Eye,
  Trash2,
  Search,
  FileStack
} from "lucide-react";
import { renderSafeHTML } from "@/lib/sanitize";
import { toExplanation } from "@/lib/jobCoaching";
import { useDropzone } from "react-dropzone";
import { OnboardingSurvey } from "./OnboardingSurvey";
import { ensureStudentProfile } from "@/lib/ensureProfile";

interface Job {
  id: string;
  title: string;
  company: string;
  city: string;
  description: string;
  skills: string[];
  apply_url: string;
  overlap?: number;
  missing_skills?: string[];
  explanationLines: string[];
}

interface Internship {
  id: string;
  company: string;
  title: string;
  city: string;
  description: string;
  skills: string[];
  visa_sponsorship: string;
  application_url: string;
}

interface SearchFilters {
  keyword: string;
  locations: string[];
  visaSponsorship: "any" | "yes" | "no";
  techStack: string[];
}

interface StudentDashboardProps {
  onLogout: () => void;
  onOpenSettings: () => void;
}

export function StudentDashboard({ onLogout, onOpenSettings }: StudentDashboardProps) {
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [matchesOffset, setMatchesOffset] = useState(0);
  
  // Use the new matches hook instead of local state
  const { data: matches = [], isLoading: isMatching, refetch: refetchMatches } = useMatches(10, matchesOffset);
  
  const [student, setStudent] = useState<any>(null);
  const [resumeAnalyzed, setResumeAnalyzed] = useState(false);
  const [showProfileWizard, setShowProfileWizard] = useState(false);
  const [tabSearchResults, setTabSearchResults] = useState<any[]>([]);
  const [tabIsSearching, setTabIsSearching] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { toast } = useToast();
  
  const handleSearchResults = useCallback((results: any[], isLoading: boolean) => {
    setTabSearchResults(results);
    setTabIsSearching(isLoading);
  }, []);

  const handleRefreshSearch = useCallback(() => {
    setRefreshCount(prev => prev + 1);
    toast({
      title: "Refreshing search",
      description: "Loading next set of internships...",
    });
  }, [toast]);

  // Remove the loadMatches function since we're using the hook

  // Initialize profile and auto-load matches
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Ensure student profile exists before querying
      await ensureStudentProfile();
      
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
      
      // Show onboarding survey if not completed
      if (s && !s.onboarding_completed) {
        setShowOnboarding(true);
      }
      
      // Initialize profile only - matches load automatically via hook
    };
    
    init();
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      init();
    });
    
    return () => subscription?.unsubscribe();
  }, []);

  const studentName = student?.name || "Student";
  
  // Get user classification from auth metadata
  const [userClassification, setUserClassification] = useState<string>("Student");
  
  useEffect(() => {
    const getUserClassification = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata?.student_year) {
        const classification = user.user_metadata.student_year;
        const capitalizedClassification = classification.charAt(0).toUpperCase() + classification.slice(1);
        setUserClassification(capitalizedClassification);
      }
    };
    getUserClassification();
  }, []);

  const studentClassification = student?.graduation_year ? `Class of ${student.graduation_year}` : userClassification;

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

      // Extract keywords from parsed data for matching
      if (data?.skills && data.skills.length > 0) {
        const allText = data.skills.join(' ') + ' ' + (data.text || '');
        const keywords = extractKeywords(allText);
        
        console.log('Extracted keywords from resume:', keywords);
        
        // Send keywords to profile API
        if (keywords.length > 0) {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.access_token) {
              const response = await fetch('/api/profile/keywords', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ tokens: keywords })
              });

              if (response.ok) {
                console.log('Profile keywords updated successfully');
                // Refetch matches to get updated results
                refetchMatches();
              } else {
                console.warn('Failed to update profile keywords:', await response.text());
              }
            }
          } catch (keywordError) {
            console.warn('Error updating profile keywords:', keywordError);
          }
        }
      }

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
      }

      toast({
        title: "Resume uploaded successfully!",
        description: `Found ${data.skills?.length || 0} skills${data.gpa ? `, GPA: ${data.gpa}` : ''}${data.graduation_year ? `, Graduation: ${data.graduation_year}` : ''}. Your profile has been updated!`,
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
    setMatchesOffset(prev => prev + 10);
    toast({
      title: "Loading next matches",
      description: "Showing the next 10 internships...",
    });
  };

  const handleApply = async (id: string, applyUrl: string, isInternship: boolean = false) => {
    // Validate URL first
    if (!applyUrl?.startsWith('https://')) {
      toast({
        title: 'Missing application link',
        description: 'This position does not have a valid application URL.',
        variant: 'destructive'
      });
      return;
    }

    // 1️⃣ OPEN IMMEDIATELY (synchronous) - prevents popup blocking
    const a = document.createElement('a');
    a.href = applyUrl;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    a.remove();

    // 2️⃣ BACKGROUND LOGGING (non-blocking)
    const logPayload = JSON.stringify({
      internship_id: isInternship ? id : null,
      application_url: applyUrl,
      direct_link: applyUrl,
      used_direct_link: true,
      user_agent: navigator.userAgent,
    });

    // Get auth header for user identification (optional)
    const { data: { session } } = await supabase.auth.getSession();
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    // Use sendBeacon if available, fallback to fetch with keepalive
    if (navigator.sendBeacon) {
      const blob = new Blob([logPayload], { type: 'application/json' });
      navigator.sendBeacon('https://tjahvypvfrjulnqmnhsh.supabase.co/functions/v1/apply-log', blob);
    } else {
      fetch('https://tjahvypvfrjulnqmnhsh.supabase.co/functions/v1/apply-log', {
        method: 'POST',
        headers,
        body: logPayload,
        keepalive: true,
      }).catch(() => {}); // Silently ignore errors
    }

    // 3️⃣ Optional toast AFTER navigation attempt
    toast({
      title: 'Application opened',
      description: 'The application page has been opened in a new tab.',
      variant: 'default'
    });
  };

  // Remove the old search function since search is now handled by InternshipSearchContainer

  const handleDeleteResume = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('students')
        .update({ resume_url: null, skills: [] })
        .eq('user_id', user.id);

      if (error) throw error;

      setStudent({ ...student, resume_url: null, skills: [] });
      setResumeAnalyzed(false);
      // Matches will automatically update via the hook
      
      toast({
        title: "Resume deleted",
        description: "Your resume has been removed successfully.",
      });
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Delete failed",
        description: "Failed to delete resume. Please try again.",
        variant: "destructive"
      });
    }
  };

  const onDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setResumeFile(file);
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      const { data, error } = await supabase.functions.invoke('upload-resume', {
        body: formData
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (error) throw error;

      // Extract keywords from parsed data for matching  
      if (data?.skills && data.skills.length > 0) {
        const allText = data.skills.join(' ') + ' ' + (data.text || '');
        const keywords = extractKeywords(allText);
        
        console.log('Extracted keywords from resume:', keywords);
        
        // Send keywords to profile API
        if (keywords.length > 0) {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.access_token) {
              const response = await fetch('/api/profile/keywords', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ tokens: keywords })
              });

              if (response.ok) {
                console.log('Profile keywords updated successfully');
                // Refetch matches to get updated results
                refetchMatches();
              } else {
                console.warn('Failed to update profile keywords:', await response.text());
              }
            }
          } catch (keywordError) {
            console.warn('Error updating profile keywords:', keywordError);
          }
        }
      }

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
      setUploadProgress(0);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxFiles: 1,
    maxSize: 2 * 1024 * 1024 // 2MB
  });


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
              {studentClassification}
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
        <div className="grid grid-cols-1 lg:grid-cols-[400px,1fr] gap-4 sm:gap-6">
          {/* Left Column: Resume Upload + Search */}
          <div className="space-y-6">
            {/* Resume Upload Section */}
            <Card className="card-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Resume Upload
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Upload Area */}
                  <div
                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                      isDragActive 
                        ? 'border-primary bg-primary/10' 
                        : 'border-border hover:border-primary/50'
                    }`}
                    {...getRootProps()}
                  >
                    <input {...getInputProps()} />
                    <div className="space-y-2">
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">Click to upload</span> or drag and drop
                      </div>
                      <p className="text-xs text-muted-foreground">PDF, DOC, DOCX (max 2MB)</p>
                    </div>
                  </div>

                  {/* Resume Status */}
                  {student?.resume_url && (
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">Resume uploaded</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(student.resume_url, '_blank')}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteResume()}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Upload Progress */}
                  {uploadProgress > 0 && uploadProgress < 100 && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Uploading...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Internship Search Filter Form Only */}
            <Card className="card-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Search Internships
                </CardTitle>
              </CardHeader>
              <CardContent>
                <InternshipSearchContainer 
                  onApply={(id, url) => handleApply(id, url, true)} 
                  showResultsInTab={true} 
                  onSearchResults={handleSearchResults}
                  onRefresh={handleRefreshSearch}
                  refreshCount={refreshCount}
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Main Content with Tabs */}
          <div>
            <Tabs defaultValue="search" className="w-full">
              <div className="flex gap-2 overflow-x-auto sm:overflow-visible px-1">
                <TabsList className="flex shrink-0 gap-2">
                  <TabsTrigger value="search" className="shrink-0 flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    Search ({tabSearchResults.length})
                  </TabsTrigger>
                  <TabsTrigger value="profile" className="shrink-0 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Profile
                  </TabsTrigger>
                  <TabsTrigger value="matches" className="shrink-0 flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Matches
                  </TabsTrigger>
                  <TabsTrigger value="applications" className="shrink-0 flex items-center gap-2">
                    <ClipboardList className="h-4 w-4" />
                    My Applications
                  </TabsTrigger>
                  <TabsTrigger value="examples" className="shrink-0 flex items-center gap-2">
                    <FileStack className="h-4 w-4" />
                    Example Resumes
                  </TabsTrigger>
                </TabsList>
              </div>
              
              <TabsContent value="search" className="mt-6">
                <Card className="card-shadow">
                  <CardHeader className="flex flex-row items-center justify-between pb-4">
                    <div className="flex items-center gap-2">
                      <Search className="h-5 w-5" />
                      <h3 className="font-semibold">Search Results</h3>
                    </div>
                    <Button 
                      onClick={handleRefreshSearch}
                      disabled={tabIsSearching}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      <RefreshCw className={`h-4 w-4 ${tabIsSearching ? 'animate-spin' : ''}`} />
                      Show Different Results
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {tabIsSearching ? (
                      <div className="text-center py-12">
                        <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin text-primary" />
                        <p className="text-lg mb-2">Searching internships...</p>
                        <p className="text-muted-foreground">Finding the best matches for you</p>
                      </div>
                    ) : tabSearchResults.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg mb-2">No internships found</p>
                        <p>Try adjusting your search filters to find more opportunities.</p>
                      </div>
                    ) : (
                      <div className="space-y-4 sm:space-y-6">
                        {tabSearchResults.map((internship) => (
                          <Card key={internship.id} className="border hover:shadow-md transition-smooth">
                            <CardContent className="p-4 sm:p-6">
                              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                                <div className="flex-1">
                                  <h3 className="text-lg sm:text-xl font-semibold leading-tight mb-1">{internship.role_title}</h3>
                                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                      <Building className="h-4 w-4" />
                                      {internship.company}
                                    </div>
                                    {internship.location && (
                                      <div className="flex items-center gap-1">
                                        <MapPin className="h-4 w-4" />
                                        {internship.location}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Description */}
                              <div className="mt-3">
                                {internship.summary_text ? (
                                  <p className="text-sm whitespace-pre-line line-clamp-6">
                                    {internship.summary_text}
                                  </p>
                                ) : (
                                  <p className="text-sm italic text-muted-foreground">
                                    Description loading…
                                  </p>
                                )}
                              </div>

                              {/* Tech Stack */}
                              {Array.isArray(internship.tech_stack) && internship.tech_stack.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-1.5">
                                  {internship.tech_stack.slice(0, 12).map((tech) => (
                                    <span key={tech} className="rounded-full border px-2 py-0.5 text-xs">
                                      {tech}
                                    </span>
                                  ))}
                                  {internship.tech_stack.length > 12 && (
                                    <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                                      +{internship.tech_stack.length - 12} more
                                    </span>
                                  )}
                                </div>
                              )}

                              <div className="mt-4 flex flex-col sm:flex-row gap-2">
                                <Button 
                                  onClick={() => handleApply(internship.id, internship.application_link, true)}
                                  className="w-full sm:w-auto h-11"
                                  size="lg"
                                  disabled={!internship.application_link}
                                >
                                  <ExternalLink className="h-4 w-4" />
                                  Apply Now
                                </Button>
                                <ApplicationToggle internshipId={internship.id} />
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="profile" className="mt-6">
                <ProfileTab />
              </TabsContent>
              
              <TabsContent value="matches" className="mt-6">
                <Card className="card-shadow">
                  <CardHeader className="flex flex-row items-center justify-between pb-4">
                    <div className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      <h3 className="font-semibold">Matches</h3>
                    </div>
                     <Button 
                      onClick={handleRefreshMatches}
                      disabled={isMatching}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      <RefreshCw className={`h-4 w-4 ${isMatching ? 'animate-spin' : ''}`} />
                      Show Different Results
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {matches.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg mb-2">No roles yet</p>
                        <p>Upload your resume to get personalized internship matches!</p>
                      </div>
                    ) : (
                      <div className="space-y-4 sm:space-y-6">
                         {matches.map((job) => (
                            <Card key={job.id} className="border hover:shadow-md transition-smooth">
                               <CardContent className="p-4 sm:p-6">
                                 <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                                   <div className="flex-1">
                                     <h3 className="text-lg sm:text-xl font-semibold leading-tight mb-1">{job.role_title || 'Software Engineering Intern'}</h3>
                                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                      <div className="flex items-center gap-1">
                                        <Building className="h-4 w-4" />
                                        {job.company}
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <MapPin className="h-4 w-4" />
                                        {job.location || 'Location TBD'}
                                      </div>
                                    </div>
                                  </div>
                                   <div className="flex items-center gap-4 sm:flex-col sm:text-right">
                                     <Popover>
                                       <PopoverTrigger className="inline-flex items-center gap-1 text-sm text-muted-foreground underline-offset-2 hover:underline">
                                         Job insights
                                       </PopoverTrigger>
                                       <PopoverContent className="w-72 sm:w-96 text-sm">
                                         <ul className="list-disc pl-4 space-y-1">
                                            <li>Match based on your profile skills</li>
                                         </ul>
                                       </PopoverContent>
                                     </Popover>
                                   </div>
                                </div>
                                  {/* Tech Stack from matched internship */}
                                  {job.tech_stack && job.tech_stack.length > 0 && (
                                    <div className="mt-3 mb-4">
                                      <div className="flex flex-wrap gap-2">
                                        {job.tech_stack.slice(0, 8).map((tech) => (
                                          <Badge key={tech} variant="outline" className="text-xs border-primary/20 bg-primary/5">
                                            {tech}
                                          </Badge>
                                        ))}
                                        {job.tech_stack.length > 8 && (
                                          <Badge variant="outline" className="text-xs">
                                            +{job.tech_stack.length - 8} more
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                
                                  {/* Description from enriched data */}
                                  <div className="mt-3">
                                    {job.summary_text ? (
                                      <p className="text-sm whitespace-pre-line line-clamp-6">
                                        {job.summary_text}
                                      </p>
                                    ) : (
                                      <p className="text-sm italic text-muted-foreground">
                                        Description loading…
                                      </p>
                                    )}
                                  </div>
                                
                                 <div className="mt-4 flex flex-col sm:flex-row gap-2">
                     <Button 
                       onClick={() => handleApply(job.id, job.application_link, true)}
                       className="w-full sm:w-auto h-11"
                       size="lg"
                       disabled={!job.application_link}
                     >
                                    <ExternalLink className="h-4 w-4" />
                                    Apply Now
                                  </Button>
                                  <ApplicationToggle internshipId={job.id} />
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
                    <MyApplications />
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="examples" className="mt-6">
                <Card className="card-shadow">
                  <CardContent className="pt-6">
                    <ExampleResumes />
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

      <OnboardingSurvey
        open={showOnboarding}
        onComplete={() => {
          setShowOnboarding(false);
          // Update local state to reflect onboarding completion
          if (student) {
            setStudent({ ...student, onboarding_completed: true });
          }
        }}
        userId={student?.user_id || ''}
      />
    </div>
  );
}