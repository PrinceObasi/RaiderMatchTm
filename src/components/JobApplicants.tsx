import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ExternalLink, Calendar } from "lucide-react";
import { format } from "date-fns";

interface JobApplicantsProps {
  job: {
    id: string;
    title: string;
  };
  open: boolean;
  onClose: () => void;
}

interface Application {
  student_id: string;
  name: string;
  email: string;
  major: string | null;
  graduation_year: number | null;
  skills: string[] | null;
  application_id: string;
  status: string;
  hire_score: number | null;
  applied_at: string;
}

export function JobApplicants({ job, open, onClose }: JobApplicantsProps) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (open && job.id) {
      loadApplications();
    }
  }, [open, job.id]);

  const loadApplications = async () => {
    setLoading(true);
    try {
      // Use the secure function to get applicant info
      const { data: applicants, error } = await supabase
        .rpc('get_applicant_info', { p_job_id: job.id });

      if (error) throw error;

      setApplications(applicants || []);
    } catch (error) {
      console.error('Error loading applications:', error);
      toast({
        title: "Error loading applications",
        description: "Could not load applicant list.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onClose}>
      <DrawerContent className="max-h-[80vh]">
        <DrawerHeader>
          <DrawerTitle>
            {job.title} – {applications.length} Applicant{applications.length !== 1 ? 's' : ''}
          </DrawerTitle>
        </DrawerHeader>
        
        <div className="px-4 pb-4 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading applicants...
            </div>
          ) : applications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No applicants yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {applications.map((app) => (
                <Card key={app.application_id} className="border hover:shadow-sm transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{app.name}</h4>
                      {app.hire_score !== null && (
                        <Badge className="bg-primary text-primary-foreground">
                          {Math.round(app.hire_score)}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        Applied {format(new Date(app.applied_at), 'MMM d, yyyy')}
                      </div>
                      {app.major && (
                        <span className="text-xs text-muted-foreground">{app.major}</span>
                      )}
                    </div>

                    {app.skills && app.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {app.skills.slice(0, 3).map((skill, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                        {app.skills.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{app.skills.length - 3} more
                          </Badge>
                        )}
                      </div>
                    )}
                    
                    <Button size="sm" variant="secondary" className="w-full">
                      <span className="flex items-center gap-2">
                        <ExternalLink className="h-3 w-3" />
                        Contact: {app.email}
                      </span>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}