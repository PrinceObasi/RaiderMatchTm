import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
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
  CalendarIcon
} from "lucide-react";

interface Candidate {
  id: string;
  name: string;
  gpa: number;
  hireScore: number;
  resumeUrl: string;
  appliedAt: string;
  status: 'applied' | 'interview' | 'rejected';
}

interface Job {
  id: string;
  title: string;
  description: string;
  location: string;
  candidates: Candidate[];
}

interface EmployerDashboardProps {
  onLogout: () => void;
}

export function EmployerDashboard({ onLogout }: EmployerDashboardProps) {
  const [jobs, setJobs] = useState<Job[]>([
    {
      id: "1",
      title: "Software Engineering Intern",
      description: "Work on cutting-edge enterprise software solutions with our Austin team.",
      location: "Austin, TX",
      candidates: [
        {
          id: "1",
          name: "Alex Rodriguez",
          gpa: 3.8,
          hireScore: 94,
          resumeUrl: "#",
          appliedAt: "2024-01-15",
          status: "applied"
        },
        {
          id: "2", 
          name: "Sarah Chen",
          gpa: 3.9,
          hireScore: 89,
          resumeUrl: "#",
          appliedAt: "2024-01-14",
          status: "applied"
        }
      ]
    }
  ]);
  
  const [newJob, setNewJob] = useState({
    title: "",
    description: "",
    location: "",
    opensAt: new Date(),
    closesAt: undefined as Date | undefined
  });
  const [isPosting, setIsPosting] = useState(false);
  const { toast } = useToast();

  // Mock company data
  const companyName = "Dell Technologies";

  const handlePostJob = async () => {
    if (!newJob.title || !newJob.description || !newJob.location) {
      toast({
        title: "Missing information",
        description: "Please fill in all job details.",
        variant: "destructive"
      });
      return;
    }

    setIsPosting(true);

    // Simulate posting delay
    setTimeout(() => {
      const job: Job = {
        id: Date.now().toString(),
        title: newJob.title,
        description: newJob.description,
        location: newJob.location,
        candidates: []
      };
      
      setJobs([job, ...jobs]);
      setNewJob({ 
        title: "", 
        description: "", 
        location: "", 
        opensAt: new Date(), 
        closesAt: undefined 
      });
      setIsPosting(false);
      
      toast({
        title: "Job posted successfully!",
        description: "Your internship posting is now live and visible to students.",
      });
    }, 1500);
  };

  const handleInviteToInterview = (jobId: string, candidateId: string, candidateName: string) => {
    setJobs(jobs.map(job => 
      job.id === jobId 
        ? {
            ...job,
            candidates: job.candidates.map(candidate =>
              candidate.id === candidateId
                ? { ...candidate, status: 'interview' as const }
                : candidate
            )
          }
        : job
    ));

    toast({
      title: "Interview invitation sent!",
      description: `${candidateName} has been invited for an interview and will be notified via email.`,
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "bg-green-500";
    if (score >= 80) return "bg-yellow-500";
    return "bg-blue-500";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'interview':
        return <Badge className="bg-success">Interview Scheduled</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">Applied</Badge>;
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

                <Button
                  onClick={handlePostJob}
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
                        <div className="mb-4">
                          <h3 className="text-lg font-semibold mb-2">{job.title}</h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                            <MapPin className="h-4 w-4" />
                            {job.location}
                          </div>
                          <p className="text-muted-foreground text-sm">{job.description}</p>
                        </div>

                        <div className="space-y-3">
                          <h4 className="font-medium flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Candidates ({job.candidates.length})
                          </h4>
                          
                          {job.candidates.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No applications yet</p>
                          ) : (
                            <div className="space-y-3">
                              {job.candidates
                                .sort((a, b) => b.hireScore - a.hireScore)
                                .map((candidate) => (
                                <Card key={candidate.id} className="border hover:shadow-sm transition-smooth">
                                  <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                          <h5 className="font-medium">{candidate.name}</h5>
                                          <Badge variant="outline">GPA: {candidate.gpa}</Badge>
                                          {getStatusBadge(candidate.status)}
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                          Applied on {new Date(candidate.appliedAt).toLocaleDateString()}
                                        </p>
                                      </div>
                                      
                                      <div className="flex items-center gap-3">
                                        <div className="text-center">
                                          <div className="text-xl font-bold text-primary">
                                            {candidate.hireScore}
                                          </div>
                                          <Badge 
                                            className={`${getScoreColor(candidate.hireScore)} text-white text-xs`}
                                          >
                                            HireScore
                                          </Badge>
                                        </div>
                                        
                                        <div className="flex gap-2">
                                          <Button variant="outline" size="sm">
                                            <FileText className="h-4 w-4" />
                                            Resume
                                          </Button>
                                          {candidate.status === 'applied' && (
                                            <Button 
                                              onClick={() => handleInviteToInterview(job.id, candidate.id, candidate.name)}
                                              size="sm"
                                            >
                                              <Mail className="h-4 w-4" />
                                              Invite
                                            </Button>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          )}
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
    </div>
  );
}