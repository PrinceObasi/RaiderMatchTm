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
import { PendingApplications } from "./PendingApplications";
import { ProfileWizard } from "./ProfileWizard";
import { InternshipSearchContainer } from "./search/InternshipSearchContainer";
import { ExampleResumes } from "./ExampleResumes";
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
  Search,
  FileStack,
  Clock
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
  const [tabSearchResults, setTabSearchResults] = useState<any[]>([]);
  const [tabIsSearching, setTabIsSearching] = useState(false);
  const [tabHasSearched, setTabHasSearched] = useState(false);
  const { toast } = useToast();
  
  const handleSearchResults = useCallback((results: any[], isLoading: boolean, hasSearched: boolean) => {
    setTabSearchResults(results);
    setTabIsSearching(isLoading);
    setTabHasSearched(hasSearched);
  }, []);

  // Auto-load matches function
  const loadMatches = async (studentData?: any, forceLoad = false, showSuccessToast = false) => {
    const currentStudent = studentData || student;
    if (!currentStudent?.id || (!resumeAnalyzed && !forceLoad)) return;
    
    setIsMatching(true);
    try {
      const { data, error } = await supabase.functions.invoke('match');
      if (error) throw error;

      setMatches(data.jobs || []);
      if (showSuccessToast) {
        toast({
          title: "Matches loaded!",
          description: `Found ${data.jobs?.length || 0} internship matches for you.`,
        });
      }
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
        await loadMatches(s, true, false); // Don't show toast on initial load
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
        await loadMatches(updatedStudent, false, true); // Show toast for resume upload
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

    await loadMatches(undefined, false, true); // Show toast for manual refresh
  };

  const handleApply = async (id: string, applyUrl: string, isInternship: boolean = false) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    // 1️⃣ Record the click first
    try {
      const clickPayload = isInternship 
        ? { user_id: session.user.id, internship_id: id, apply_url: applyUrl }
        : { user_id: session.user.id, job_id: id, apply_url: applyUrl };

      await supabase.from('application_clicks').insert(clickPayload);
    } catch (error) {
      console.error('Error recording application click:', error);
    }

    // 2️⃣ Open the external page immediately (within the user gesture)
    if (applyUrl?.startsWith('https://')) {
      window.open(applyUrl, '_blank', 'noopener,noreferrer');
    } else {
      toast({
        title: 'Missing application link',
        description: 'This position does not have a valid application URL.',
        variant: 'destructive'
      });
      return;
    }

    // 3️⃣ Record the application in the background (legacy - keeping for compatibility)
    try {
      const payload = isInternship 
        ? { internship_id: id, apply_url: applyUrl }
        : { job_id: id, apply_url: applyUrl };

      const { data, error } = await supabase.functions.invoke('apply', {
        body: payload
      });

      if (error) {
        console.error('Apply function error:', error);
        
        // Check for specific error messages and show appropriate toasts
        if (error.message?.includes('Already applied')) {
          toast({
            title: 'Already Applied',
            description: 'You have already applied to this position.',
            variant: 'default'
          });
        } else if (error.message?.includes('Rate limit')) {
          toast({
            title: 'Please Wait',
            description: 'You are applying too frequently. Please wait before applying again.',
            variant: 'destructive'
          });
        } else {
          toast({
            title: 'Application Link Opened',
            description: 'Please confirm your application in the Pending tab after applying.',
            variant: 'default'
          });
        }
      } else if (data?.success) {
        toast({
          title: 'Application Link Opened',
          description: 'Please confirm your application in the Pending tab after applying.',
          variant: 'default'
        });
      }
    } catch (err) {
      console.error('Apply function call failed:', err);
      toast({
        title: 'Application Link Opened',
        description: 'Please confirm your application in the Pending tab after applying.',
        variant: 'default'
      });
    }
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
        await loadMatches(updatedStudent, false, true); // Show toast for resume upload
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
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Main Content with Tabs */}
          <div>
            <Tabs defaultValue={tabHasSearched ? "search" : "matches"} className="w-full">
              <div className="flex gap-2 overflow-x-auto sm:overflow-visible px-1">
                <TabsList className="flex shrink-0 gap-2">
                  <TabsTrigger value="search" className="shrink-0 flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    Search Results ({tabSearchResults.length})
                  </TabsTrigger>
                  <TabsTrigger value="matches" className="shrink-0 flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Matches ({matches.length})
                  </TabsTrigger>
                  <TabsTrigger value="pending" className="shrink-0 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Pending
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
                  <CardContent className="pt-6">
                    {!tabHasSearched ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg mb-2">Search for internships</p>
                        <p>Use the search form on the left to find internships that match your criteria.</p>
                      </div>
                    ) : tabIsSearching ? (
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
                                  <h3 className="text-lg sm:text-xl font-semibold leading-tight mb-1">{internship.role_title || internship.title}</h3>
                                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                      <Building className="h-4 w-4" />
                                      {internship.company}
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <MapPin className="h-4 w-4" />
                                      {internship.location || internship.city}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {internship.visa_sponsorship && internship.visa_sponsorship !== 'Unspecified' && (
                                    <Badge variant={internship.visa_sponsorship === 'Yes' ? 'default' : 'secondary'}>
                                      {internship.visa_sponsorship === 'Yes' ? 'Sponsors Visa' : 'No Visa Sponsorship'}
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              {/* Tech Stack */}
                              {(internship.tech_stack || internship.skills) && (internship.tech_stack || internship.skills).length > 0 && (
                                <div className="mt-3 mb-4">
                                  <div className="flex flex-wrap gap-2">
                                    {(internship.tech_stack || internship.skills).slice(0, 8).map((tech) => (
                                      <Badge key={tech} variant="outline" className="text-xs">
                                        {tech}
                                      </Badge>
                                    ))}
                                    {(internship.tech_stack || internship.skills).length > 8 && (
                                      <Badge variant="outline" className="text-xs">
                                        +{(internship.tech_stack || internship.skills).length - 8} more
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Description */}
                              {internship.description && (
                                <p className="mt-2 text-sm sm:text-base text-muted-foreground line-clamp-3 sm:line-clamp-none mb-4">
                                  {internship.description}
                                </p>
                              )}

                              <div className="mt-4">
                <Button 
                  onClick={() => handleApply(internship.id, internship.application_link || internship.application_url || '', true)}
                  className="w-full sm:w-auto h-11"
                  size="lg"
                  disabled={!(internship.application_link || internship.application_url)}
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
                     onClick={() => handleApply(job.id, job.apply_url, false)}
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
              
              <TabsContent value="pending" className="mt-6">
                <Card className="card-shadow">
                  <CardContent className="pt-6">
                    <PendingApplications />
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
    </div>
  );
}