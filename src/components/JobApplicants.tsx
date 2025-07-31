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
  id: string;
  hire_score: number | null;
  applied_at: string;
  user_id: string;
  student_name?: string;
  student_resume_url?: string | null;
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
      // First get applications
      const { data: applications, error: appsError } = await supabase
        .from('applications')
        .select('id, hire_score, applied_at, user_id')
        .eq('job_id', job.id)
        .order('hire_score', { ascending: false });

      if (appsError) throw appsError;

      // Then get student details for each application
      const enrichedApplications = await Promise.all(
        (applications || []).map(async (app) => {
          const { data: student } = await supabase
            .from('students')
            .select('name, resume_url')
            .eq('user_id', app.user_id)
            .single();

          return {
            ...app,
            student_name: student?.name || 'Unknown',
            student_resume_url: student?.resume_url || null
          };
        })
      );

      setApplications(enrichedApplications);
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
                <Card key={app.id} className="border hover:shadow-sm transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{app.student_name}</h4>
                      {app.hire_score !== null && (
                        <Badge className="bg-primary text-primary-foreground">
                          {Math.round(app.hire_score)}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                      <Calendar className="h-3 w-3" />
                      Applied {format(new Date(app.applied_at), 'MMM d, yyyy')}
                    </div>
                    
                    {app.student_resume_url && (
                      <Button asChild size="sm" variant="secondary" className="w-full">
                        <a 
                          href={app.student_resume_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2"
                        >
                          <ExternalLink className="h-3 w-3" />
                          View Resume
                        </a>
                      </Button>
                    )}
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