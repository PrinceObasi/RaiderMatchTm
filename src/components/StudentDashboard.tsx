import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type StudentRow = Database["public"]["Tables"]["students"]["Row"];
import { ApplicationList } from "./ApplicationList";
import { ProfileWizard } from "./ProfileWizard";
import { ApplicationSchema } from "@/lib/schemas";
import { CompanyLogo, timeAgo, isNew } from "./CompanyLogo";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
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
  Calendar,
  Filter,
  X,
  DollarSign,
  Heart,
  Share2,
  Globe,
  Home,
  Monitor,
  Clock,
  Star
} from "lucide-react";
import { renderSafeHTML } from "@/lib/sanitize";

interface Job {
  id: string;
  title: string;
  company: string;
  company_logo?: string;
  city: string;
  hireScore: number;
  composite_score?: number;
  description: string;
  summary_text?: string;
  skills: string[];
  matched_skills?: string[];
  missing_skills?: string[];
  apply_url: string;
  posted_date: string;
  date_posted?: string;
  job_type?: string;
  salary_min?: number;
  salary_max?: number;
  salary_period?: string;
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
  const [filteredMatches, setFilteredMatches] = useState<Job[]>([]);
  const [hasResume, setHasResume] = useState(false);
  const [profile, setProfile] = useState<StudentRow | null>(null);
  const [showProfileWizard, setShowProfileWizard] = useState(false);
  const [skillFilter, setSkillFilter] = useState<string[]>([]);
  const [cityFilter, setCityFilter] = useState<string>("");
  const [availableSkills, setAvailableSkills] = useState<string[]>([]);
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [savedJobs, setSavedJobs] = useState<Set<string>>(new Set());
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

  // Filter matches based on selected filters
  useEffect(() => {
    let filtered = matches;

    // Filter by skills
    if (skillFilter.length > 0) {
      filtered = filtered.filter(job => 
        skillFilter.some(selectedSkill => 
          job.skills?.some(jobSkill => 
            jobSkill.toLowerCase().includes(selectedSkill.toLowerCase())
          )
        )
      );
    }

    // Filter by city
    if (cityFilter && cityFilter !== "all") {
      filtered = filtered.filter(job => 
        job.city.toLowerCase().includes(cityFilter.toLowerCase())
      );
    }

    setFilteredMatches(filtered);
  }, [matches, skillFilter, cityFilter]);

  const handleSkillFilterChange = (skill: string, checked: boolean) => {
    if (checked) {
      setSkillFilter(prev => [...prev, skill]);
    } else {
      setSkillFilter(prev => prev.filter(s => s !== skill));
    }
  };

  const clearFilters = () => {
    setSkillFilter([]);
    setCityFilter("");
  };

  const formatSalary = (min?: number, max?: number) => {
    if (!min && !max) return "Salary not disclosed";
    if (min && max) {
      return `$${(min / 1000).toFixed(0)}K - $${(max / 1000).toFixed(0)}K`;
    }
    if (min) return `$${(min / 1000).toFixed(0)}K+`;
    if (max) return `Up to $${(max / 1000).toFixed(0)}K`;
    return "Salary not disclosed";
  };

  const getJobTypeIcon = (jobType?: string) => {
    switch (jobType?.toLowerCase()) {
      case 'remote':
        return <Globe className="h-4 w-4" />;
      case 'hybrid':
        return <Monitor className="h-4 w-4" />;
      case 'on-site':
      case 'onsite':
        return <Home className="h-4 w-4" />;
      default:
        return <Building className="h-4 w-4" />;
    }
  };

  const getJobTypeBadgeColor = (jobType?: string) => {
    switch (jobType?.toLowerCase()) {
      case 'remote':
        return "bg-green-100 text-green-800 border-green-200";
      case 'hybrid':
        return "bg-blue-100 text-blue-800 border-blue-200";
      case 'on-site':
      case 'onsite':
        return "bg-orange-100 text-orange-800 border-orange-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const toggleSaveJob = (jobId: string) => {
    setSavedJobs(prev => {
      const newSaved = new Set(prev);
      if (newSaved.has(jobId)) {
        newSaved.delete(jobId);
        toast({
          title: "Job removed",
          description: "Removed from saved jobs",
        });
      } else {
        newSaved.add(jobId);
        toast({
          title: "Job saved",
          description: "Added to saved jobs",
        });
      }
      return newSaved;
    });
  };

  const shareJob = async (job: Job) => {
    const shareData = {
      title: `${job.title} at ${job.company}`,
      text: `Check out this internship opportunity: ${job.title} at ${job.company}`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        // Fallback to clipboard
        navigator.clipboard.writeText(`${shareData.title} - ${shareData.url}`);
        toast({
          title: "Link copied",
          description: "Job link copied to clipboard",
        });
      }
    } else {
      navigator.clipboard.writeText(`${shareData.title} - ${shareData.url}`);
      toast({
        title: "Link copied",
        description: "Job link copied to clipboard",
      });
    }
  };

  const ApplicationToggle = ({ jobId }: { jobId: string }) => {
    const [isApplied, setIsApplied] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
      const checkApplicationStatus = async () => {
        const { data } = await supabase.rpc('check_application', {
          p_internship_id: jobId,
        });
        if ((data as { applied?: boolean } | null)?.applied) {
          setIsApplied(true);
        }
      };
      checkApplicationStatus();
    }, [jobId]);

    const toggleApplication = async () => {
      setIsLoading(true);
      try {
        if (isApplied) {
          const { data: { user } } = await supabase.auth.getUser();
          const { error } = await supabase
            .from('applications')
            .delete()
            .eq('user_id', user!.id)
            .eq('internship_id', jobId);
          if (error) {
            console.error('Remove RPC error:', error);
            toast({ title: "Failed to remove", description: error.message, variant: "destructive" });
            return;
          }
          setIsApplied(false);
          toast({ title: "Application removed", description: "You can re-apply later" });
        } else {
          const { data, error } = await supabase.rpc('save_application', {
            p_internship_id: jobId,
          });
          if (error) {
            console.error('Save RPC error:', error);
            toast({ title: "Failed to save application", description: error.message, variant: "destructive" });
            return;
          }
          const result = data as { success?: boolean; message?: string } | null;
          if (result?.success === false) {
            toast({ title: "Failed to save", description: result?.message || "Unknown error", variant: "destructive" });
            return;
          }
          setIsApplied(true);
          toast({ title: "Application tracked!", description: "Marked as applied" });
        }
      } catch (error: unknown) {
        console.error('Error toggling application:', error);
        const message = error instanceof Error ? error.message : "Something went wrong";
        toast({ title: "Error", description: message, variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <Button
        variant={isApplied ? "default" : "outline"}
        size="sm"
        onClick={toggleApplication}
        disabled={isLoading}
        className={`${isApplied ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
      >
        {isLoading ? '...' : isApplied ? '✓ Applied' : 'Track'}
      </Button>
    );
  };

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

      const jobMatches = data.jobs || [];
      setMatches(jobMatches);
      
      // Extract available skills and cities for filters
      const allSkills = new Set<string>();
      const allCities = new Set<string>();
      
      jobMatches.forEach((job: Job) => {
        if (job.skills) {
          job.skills.forEach(skill => allSkills.add(skill));
        }
        if (job.city) {
          allCities.add(job.city);
        }
      });
      
      setAvailableSkills(Array.from(allSkills).sort());
      setAvailableCities(Array.from(allCities).sort());
      
      toast({
        title: "Matches found!",
        description: `Found ${jobMatches.length} perfect internship matches for you.`,
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

  const handleApply = async (jobId: string, applyUrl: string, hireScore?: number) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      toast({
        title: 'Not signed in',
        description: 'Please sign in to apply to jobs.',
        variant: 'destructive'
      });
      return;
    }

    // 1. Open the external page immediately (within the user gesture)
    if (applyUrl?.startsWith('http')) {
      window.open(applyUrl, '_blank', 'noopener,noreferrer');
    }

    // 2. Record the application via RPC (SECURITY DEFINER, bypasses RLS)
    try {
      const { error } = await supabase.rpc('save_application', {
        p_internship_id: jobId,
      });

      if (error) {
        console.error('save_application RPC error:', error);
        toast({
          title: 'Application failed',
          description: error.message || 'Could not save application.',
          variant: 'destructive'
        });
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

                {hasResume && (
                  <div className="flex items-center gap-2 text-sm text-success">
                    <FileText className="h-4 w-4" />
                    Resume uploaded and analyzed
                  </div>
                )}

                <div className="space-y-2">
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
                    Matches ({filteredMatches.length})
                  </TabsTrigger>
                  <TabsTrigger value="applications" className="shrink-0 flex items-center gap-2">
                    <ClipboardList className="h-4 w-4" />
                    My Applications
                  </TabsTrigger>
                </TabsList>
              </div>
              
              <TabsContent value="matches" className="mt-6">
                {/* Filter Controls */}
                {matches.length > 0 && (
                  <Card className="card-shadow mb-6">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold flex items-center gap-2">
                          <Filter className="h-4 w-4" />
                          Filter Internships
                        </h3>
                        {(skillFilter.length > 0 || cityFilter) && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={clearFilters}
                            className="flex items-center gap-2"
                          >
                            <X className="h-4 w-4" />
                            Clear Filters
                          </Button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* City Filter */}
                        <div>
                          <Label className="text-sm font-medium mb-2 block">Location</Label>
                          <Select value={cityFilter} onValueChange={setCityFilter}>
                            <SelectTrigger>
                              <SelectValue placeholder="All locations" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">All locations</SelectItem>
                              {availableCities.map(city => (
                                <SelectItem key={city} value={city}>{city}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Skills Filter */}
                        <div>
                          <Label className="text-sm font-medium mb-2 block">
                            Tech Stack ({skillFilter.length} selected)
                          </Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="w-full justify-start">
                                <Filter className="h-4 w-4 mr-2" />
                                {skillFilter.length === 0 
                                  ? "Select skills..." 
                                  : `${skillFilter.length} skills selected`
                                }
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80">
                              <div className="max-h-60 overflow-y-auto space-y-2">
                                {availableSkills.map(skill => (
                                  <div key={skill} className="flex items-center space-x-2">
                                    <Checkbox 
                                      id={skill}
                                      checked={skillFilter.includes(skill)}
                                      onCheckedChange={(checked) => 
                                        handleSkillFilterChange(skill, checked as boolean)
                                      }
                                    />
                                    <Label htmlFor={skill} className="text-sm">{skill}</Label>
                                  </div>
                                ))}
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                      
                      {/* Active Filters Display */}
                      {skillFilter.length > 0 && (
                        <div className="mt-4">
                          <Label className="text-sm font-medium mb-2 block">Active Tech Stack Filters:</Label>
                          <div className="flex flex-wrap gap-2">
                            {skillFilter.map(skill => (
                              <Badge key={skill} variant="secondary" className="flex items-center gap-1">
                                {skill}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-4 w-4 p-0 hover:bg-transparent"
                                  onClick={() => handleSkillFilterChange(skill, false)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                <Card className="card-shadow">
                  <CardContent className="pt-6">
                    {matches.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg mb-2">No matches yet</p>
                        <p>Upload your resume and click "Refresh Matches" to find perfect internships!</p>
                      </div>
                    ) : filteredMatches.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg mb-2">No matches found</p>
                        <p>Try adjusting your filters to see more internships.</p>
                        <Button 
                          variant="outline" 
                          onClick={clearFilters}
                          className="mt-4"
                        >
                          Clear All Filters
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4 sm:space-y-6">
                        {filteredMatches.map((job) => {
                          const score = job.composite_score ?? job.hireScore;
                          const scoreColor = score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-yellow-500' : 'bg-red-500';
                          const postDate = job.date_posted || job.posted_date;
                          const displayText = job.summary_text || job.description;
                          const matchedSkills = job.matched_skills || [];
                          const missingSkills = job.missing_skills || [];

                          return (
                           <Card key={job.id} className="group border hover:shadow-lg hover:border-primary/20 transition-all duration-300 overflow-hidden relative">
                              <CardContent className="p-4 sm:p-6">
                                {/* Score badge top-right */}
                                <div className="absolute top-3 right-3 flex items-center gap-2">
                                  {isNew(postDate) && (
                                    <Badge className="bg-teal-100 text-teal-800 border-teal-200 text-xs px-2 py-0.5">New</Badge>
                                  )}
                                  <Badge className={`${scoreColor} text-white text-xs px-2 py-0.5`}>
                                    {score}% match
                                  </Badge>
                                </div>

                                <div className="flex items-start gap-4">
                                  <CompanyLogo company={job.company} size={56} />

                                  <div className="flex-1 min-w-0 pr-24">
                                    <h3 className="font-bold text-lg text-gray-900 mb-1 leading-tight">{job.title}</h3>
                                    <p className="text-gray-600 font-medium">{job.company}</p>

                                    <div className="flex items-center gap-4 text-sm text-gray-500 mt-1 mb-3">
                                      <span className="flex items-center gap-1">
                                        <MapPin className="h-3.5 w-3.5" />
                                        {job.city}
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <Clock className="h-3.5 w-3.5" />
                                        {timeAgo(postDate)}
                                      </span>
                                      {job.salary_min != null && job.salary_max != null && (
                                        <span className="flex items-center gap-1 text-green-700 font-medium">
                                          <DollarSign className="h-3.5 w-3.5" />
                                          ${job.salary_min}{job.salary_period === 'hour' ? '' : 'k'}-${job.salary_max}{job.salary_period === 'hour' ? '/hr' : 'k/yr'}
                                        </span>
                                      )}
                                    </div>

                                    <p className="text-gray-700 text-sm mb-4 line-clamp-3 leading-relaxed">{displayText}</p>

                                    {/* Matched skills */}
                                    <div className="flex flex-wrap gap-1.5 mb-2">
                                      {(matchedSkills.length > 0 ? matchedSkills : job.skills).slice(0, 5).map((skill, index) => (
                                        <Badge key={index} className="bg-green-50 text-green-700 border-green-200 text-xs px-2 py-0.5">{skill}</Badge>
                                      ))}
                                      {(matchedSkills.length > 0 ? matchedSkills : job.skills).length > 5 && (
                                        <Badge variant="secondary" className="text-xs px-2 py-0.5">
                                          +{(matchedSkills.length > 0 ? matchedSkills : job.skills).length - 5} more
                                        </Badge>
                                      )}
                                    </div>

                                    {/* Missing skills */}
                                    {missingSkills.length > 0 && (
                                      <div className="flex flex-wrap gap-1.5 mb-3">
                                        <span className="text-xs text-gray-400 self-center">Boost tip:</span>
                                        {missingSkills.slice(0, 3).map((skill, index) => (
                                          <Badge key={index} variant="outline" className="text-xs px-2 py-0.5 text-gray-400 border-gray-200">{skill}</Badge>
                                        ))}
                                      </div>
                                    )}

                                    <div className="flex items-center gap-2 pt-1">
                                      <Button
                                        onClick={() => handleApply(job.id, job.apply_url, job.hireScore)}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-6"
                                      >
                                        Apply Now
                                      </Button>
                                      <ApplicationToggle jobId={job.id} />
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                          </Card>
                          );
                        })}
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
        userId={profile?.user_id || ''}
        onComplete={() => {
          // Reload profile after completion
          const loadProfile = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
              const { data: updatedProfile } = await supabase
                .from('students')
                .select('*')
                .eq('user_id', session.user.id)
                .single();
              setProfile(updatedProfile);
            }
          };
          loadProfile();
        }}
      />
    </div>
  );
}