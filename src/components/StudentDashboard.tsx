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
import { InternshipSearch } from "./InternshipSearch";
import { InternshipResults } from "./InternshipResults";
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
  Settings2,
  Eye,
  Trash2,
  Search
} from "lucide-react";
import { renderSafeHTML } from "@/lib/sanitize";
import { toExplanation } from "@/lib/jobCoaching";
import { useDropzone } from "react-dropzone";

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
  const [isMatching, setIsMatching] = useState(false);
  const [matches, setMatches] = useState<Job[]>([]);
  const [student, setStudent] = useState<any>(null);
  const [resumeAnalyzed, setResumeAnalyzed] = useState(false);
  const [showProfileWizard, setShowProfileWizard] = useState(false);
  const [searchResults, setSearchResults] = useState<Internship[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
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

  const handleApply = async (jobId: string, applyUrl: string) => {
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

  const handleSearch = async (filters: SearchFilters) => {
    setIsSearching(true);
    setHasSearched(true);
    
    try {
      let query = supabase
        .from('jobs_for_app')
        .select('id, company, title, city, description, skills, visa_sponsorship, application_url')
        .eq('is_active', true)
        .order('title', { ascending: true });

      // Apply keyword filter across company, title, and description
      if (filters.keyword) {
        const keyword = `%${filters.keyword}%`;
        query = query.or(`company.ilike.${keyword},title.ilike.${keyword},description.ilike.${keyword}`);
      }

      // Apply location filter
      if (filters.locations.length > 0) {
        query = query.in('city', filters.locations);
      }

      // Apply visa sponsorship filter
      if (filters.visaSponsorship !== 'any') {
        const visaValue = filters.visaSponsorship === 'yes' ? 'Yes' : 'No';
        query = query.eq('visa_sponsorship', visaValue);
      }

      // Apply tech stack filter
      if (filters.techStack.length > 0) {
        query = query.overlaps('skills', filters.techStack);
      }

      const { data, error } = await query.limit(50);

      if (error) throw error;

      setSearchResults(data || []);
      
      toast({
        title: "Search completed",
        description: `Found ${data?.length || 0} internships matching your criteria.`,
      });
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: "Search failed",
        description: "Failed to search internships. Please try again.",
        variant: "destructive"
      });
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

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
      setMatches([]);
      
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

            {/* Internship Search Section */}
            <Card className="card-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Search Internships
                </CardTitle>
              </CardHeader>
              <CardContent>
                <InternshipSearch onFiltersChange={handleSearch} />
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Main Content with Tabs */}
          <div>
            <Tabs defaultValue={hasSearched ? "search" : "matches"} className="w-full">
              <div className="flex gap-2 overflow-x-auto sm:overflow-visible px-1">
                <TabsList className="flex shrink-0 gap-2">
                  <TabsTrigger value="search" className="shrink-0 flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    Search Results ({searchResults.length})
                  </TabsTrigger>
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
              
              <TabsContent value="search" className="mt-6">
                <InternshipResults 
                  internships={searchResults}
                  isLoading={isSearching}
                  onApply={handleApply}
                />
              </TabsContent>
              
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
                                    <Popover>
                                      <PopoverTrigger className="inline-flex items-center gap-1 text-sm text-muted-foreground underline-offset-2 hover:underline">
                                        Job insights
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
                                     onClick={() => handleApply(job.id, job.apply_url)}
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