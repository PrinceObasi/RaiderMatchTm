import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { JobApplicants } from "@/components/JobApplicants";
import { 
  Plus, 
  Building, 
  Users, 
  FileText, 
  Mail,
  LogOut,
  Star,
  MapPin,
  ExternalLink,
  CalendarIcon,
  Eye
} from "lucide-react";

interface Job {
  id: string;
  title: string;
  description: string;
  city: string;
  company: string;
  opens_at: string;
  closes_at: string | null;
  is_active: boolean;
  apply_url: string;
  employer_id?: string;
  created_at?: string;
  updated_at?: string;
  posted_date?: string;
  deadline?: string;
  skills?: string[];
  type?: string;
  applications?: { count: number }[];
}

interface EmployerDashboardProps {
  onLogout: () => void;
}

export function EmployerDashboard({ onLogout }: EmployerDashboardProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState<{ id: string; title: string } | null>(null);
  const [showApplicants, setShowApplicants] = useState(false);
  const [newJob, setNewJob] = useState({
    title: "",
    description: "",
    location: "",
    applyUrl: "",
    opensAt: new Date(),
    closesAt: undefined as Date | undefined
  });
  const [companyName, setCompanyName] = useState("");

  // Get company name from user session
  useEffect(() => {
    const getCompanyName = async () => {
      const { data: session } = await supabase.auth.getSession();
      if (session?.session?.user?.user_metadata?.company) {
        setCompanyName(session.session.user.user_metadata.company);
      }
    };
    getCompanyName();
  }, []);
  const [isPosting, setIsPosting] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Load employer's jobs
  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) return;

      const { data, error } = await supabase
        .from('jobs')
        .select('*, applications(count)')
        .eq('employer_id', session.session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJobs(data || []);
    } catch (error) {
      console.error('Error loading jobs:', error);
      toast({
        title: "Error loading jobs",
        description: "Could not load your job postings.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateJob = async () => {
    if (!newJob.title || !newJob.description || !newJob.location || !newJob.applyUrl) {
      toast({
        title: "Missing information",
        description: "Please fill in all job details.",
        variant: "destructive"
      });
      return;
    }

    // Basic URL validation
    try {
      new URL(newJob.applyUrl);
    } catch {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid application URL.",
        variant: "destructive"
      });
      return;
    }

    setIsPosting(true);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) throw new Error('Not authenticated');

      const { error } = await supabase.from('jobs').insert({
        employer_id: session.session.user.id,
        title: newJob.title,
        description: newJob.description,
        city: newJob.location,
        company: session.session.user.user_metadata?.company || 'Unknown Company',
        apply_url: newJob.applyUrl,
        opens_at: newJob.opensAt.toISOString().split('T')[0],
        closes_at: newJob.closesAt?.toISOString().split('T')[0] || null,
        is_active: true,
        type: 'internship',
        skills: []
      });

      if (error) throw error;

      await loadJobs();
      setNewJob({ 
        title: "", 
        description: "", 
        location: "", 
        applyUrl: "",
        opensAt: new Date(), 
        closesAt: undefined 
      });
      setShowCreateModal(false);
      
      toast({
        title: "Job posted successfully!",
        description: "Your internship posting is now live and visible to students.",
      });
    } catch (error) {
      console.error('Error creating job:', error);
      toast({
        title: "Error posting job",
        description: "Could not create job posting.",
        variant: "destructive"
      });
    } finally {
      setIsPosting(false);
    }
  };

  const toggleJobActive = async (jobId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ is_active: !currentStatus })
        .eq('id', jobId);

      if (error) throw error;

      setJobs(jobs.map(job => 
        job.id === jobId 
          ? { ...job, is_active: !currentStatus }
          : job
      ));

      toast({
        title: "Job status updated",
        description: `Job ${!currentStatus ? 'activated' : 'deactivated'} successfully.`,
      });
    } catch (error) {
      console.error('Error updating job status:', error);
      toast({
        title: "Error updating job",
        description: "Could not update job status.",
        variant: "destructive"
      });
    }
  };



  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Building className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-xl font-bold">Employer Dashboard</h1>
              <p className="text-sm text-muted-foreground">{companyName}</p>
            </div>
          </div>
          
          <Button variant="ghost" onClick={onLogout} size="sm">
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Post Job Section */}
          <div className="lg:col-span-1">
            <Card className="card-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Post New Internship
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Job Title</Label>
                  <Input
                    id="title"
                    value={newJob.title}
                    onChange={(e) => setNewJob({ ...newJob, title: e.target.value })}
                    placeholder="e.g. Software Engineering Intern"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={newJob.location}
                    onChange={(e) => setNewJob({ ...newJob, location: e.target.value })}
                    placeholder="e.g. Austin, TX"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newJob.description}
                    onChange={(e) => setNewJob({ ...newJob, description: e.target.value })}
                    placeholder="Describe the internship role, responsibilities, and requirements..."
                    className="mt-1 min-h-24"
                  />
                </div>

                <div>
                  <Label>Open Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal mt-1",
                          !newJob.opensAt && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {newJob.opensAt ? format(newJob.opensAt, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={newJob.opensAt}
                        onSelect={(date) => setNewJob({ ...newJob, opensAt: date || new Date() })}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label>Close Date (Optional)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal mt-1",
                          !newJob.closesAt && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {newJob.closesAt ? format(newJob.closesAt, "PPP") : <span>Pick a date (optional)</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={newJob.closesAt}
                        onSelect={(date) => setNewJob({ ...newJob, closesAt: date })}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label htmlFor="applyUrl">Application URL</Label>
                  <Input
                    id="applyUrl"
                    value={newJob.applyUrl}
                    onChange={(e) => setNewJob({ ...newJob, applyUrl: e.target.value })}
                    placeholder="https://company.com/apply"
                    className="mt-1"
                  />
                </div>

                <Button
                  onClick={handleCreateJob}
                  disabled={isPosting}
                  className="w-full"
                  size="lg"
                >
                  {isPosting ? (
                    <>
                      <Plus className="h-4 w-4 animate-spin" />
                      Posting...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Post Internship
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Jobs & Candidates Section */}
          <div className="lg:col-span-2">
            <Card className="card-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Posted Jobs & Candidates
                </CardTitle>
              </CardHeader>
              <CardContent>
                {jobs.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg mb-2">No jobs posted yet</p>
                    <p>Post your first internship to start receiving applications!</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {jobs.map((job) => (
                      <div key={job.id} className="border rounded-lg p-6">
                         <div className="flex items-center justify-between mb-4">
                           <div className="flex-1">
                             <h3 className="text-lg font-semibold mb-2">{job.title}</h3>
                             <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                               <MapPin className="h-4 w-4" />
                               {job.city}
                             </div>
                             <p className="text-muted-foreground text-sm">{job.description}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline">Opens: {new Date(job.opens_at).toLocaleDateString()}</Badge>
                                {job.closes_at && (
                                  <Badge variant="outline">Closes: {new Date(job.closes_at).toLocaleDateString()}</Badge>
                                )}
                                <Badge variant={job.is_active ? "default" : "secondary"}>
                                  {job.is_active ? "Active" : "Inactive"}
                                </Badge>
                                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                  {job.applications?.[0]?.count || 0} applicant{(job.applications?.[0]?.count || 0) !== 1 ? 's' : ''}
                                </Badge>
                              </div>
                           </div>
                           
                            <div className="flex items-center gap-3">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => {
                                  setSelectedJob({ id: job.id, title: job.title });
                                  setShowApplicants(true);
                                }}
                                disabled={(job.applications?.[0]?.count || 0) === 0}
                              >
                                <Eye className="h-4 w-4" />
                                View ({job.applications?.[0]?.count || 0})
                              </Button>
                              <div className="flex items-center space-x-2">
                                <Label htmlFor={`active-${job.id}`} className="text-sm">
                                  {job.is_active ? "Active" : "Inactive"}
                                </Label>
                                <Switch
                                  id={`active-${job.id}`}
                                  checked={job.is_active}
                                  onCheckedChange={() => toggleJobActive(job.id, job.is_active)}
                                />
                              </div>
                              <Button variant="outline" size="sm" asChild>
                                <a href={job.apply_url} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-4 w-4" />
                                  View Application
                                </a>
                              </Button>
                            </div>
                         </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Job Applicants Drawer */}
      {selectedJob && (
        <JobApplicants
          job={selectedJob}
          open={showApplicants}
          onClose={() => {
            setShowApplicants(false);
            setSelectedJob(null);
          }}
        />
      )}
    </div>
  );
}