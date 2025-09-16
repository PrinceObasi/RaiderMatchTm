import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { CheckCircle, Clock, Building, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PendingApplication {
  id: string;
  clicked_at: string;
  apply_url: string;
  confirmed: boolean;
  internship_id?: string;
  job_id?: string;
  jobs?: {
    title: string;
    company: string;
    city: string;
  };
  internships?: {
    company: string;
    role_title: string;
    location: string;
  };
}

export function PendingApplications() {
  const [pendingApps, setPendingApps] = useState<PendingApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingIds, setConfirmingIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    fetchPendingApplications();
  }, []);

  const fetchPendingApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('application_clicks')
        .select(`
          id,
          clicked_at,
          apply_url,
          confirmed,
          internship_id,
          job_id
        `)
        .eq('confirmed', false)
        .order('clicked_at', { ascending: false });

      if (error) throw error;
      
      // Fetch job/internship details separately
      const enrichedData = await Promise.all((data || []).map(async (click) => {
        let jobInfo = null;
        
        if (click.job_id) {
          const { data: job } = await supabase
            .from('jobs')
            .select('title, company, city')
            .eq('id', click.job_id)
            .single();
          if (job) jobInfo = { jobs: job };
        }
        
        if (click.internship_id) {
          const { data: internship } = await supabase
            .from('internships')
            .select('company, role_title, location')
            .eq('id', click.internship_id)
            .single();
          if (internship) jobInfo = { internships: internship };
        }
        
        return { ...click, ...jobInfo };
      }));
      
      setPendingApps(enrichedData);
    } catch (error) {
      console.error('Error fetching pending applications:', error);
      toast({
        title: "Error",
        description: "Failed to load pending applications.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const confirmApplication = async (clickId: string) => {
    setConfirmingIds(prev => new Set(prev).add(clickId));

    try {
      const { data, error } = await supabase.rpc('confirm_application', {
        click_id: clickId
      });

      if (error) throw error;

      const result = data as { success: boolean; message?: string };

      if (result.success) {
        toast({
          title: "Application confirmed!",
          description: "Your application has been added to your applications list.",
        });
        
        // Remove from pending list
        setPendingApps(prev => prev.filter(app => app.id !== clickId));
      } else {
        throw new Error(result.message || 'Failed to confirm application');
      }
    } catch (error) {
      console.error('Error confirming application:', error);
      toast({
        title: "Error",
        description: "Failed to confirm application. Please try again.",
        variant: "destructive"
      });
    } finally {
      setConfirmingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(clickId);
        return newSet;
      });
    }
  };

  const dismissPending = async (clickId: string) => {
    try {
      const { error } = await supabase
        .from('application_clicks')
        .update({ confirmed: true })
        .eq('id', clickId);

      if (error) throw error;

      setPendingApps(prev => prev.filter(app => app.id !== clickId));
      toast({
        title: "Dismissed",
        description: "Application click dismissed.",
      });
    } catch (error) {
      console.error('Error dismissing pending application:', error);
      toast({
        title: "Error",
        description: "Failed to dismiss application.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading pending applications...</div>;
  }

  if (pendingApps.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg mb-2">No pending confirmations</p>
        <p>When you click on job application links, they'll appear here for confirmation.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Confirm Your Applications</h3>
        <p className="text-sm text-muted-foreground">
          Did you apply to these positions? Confirm to track them in your applications.
        </p>
      </div>

      {pendingApps.map((app) => {
        const jobInfo = app.jobs || app.internships;
        const title = jobInfo ? (app.jobs?.title || app.internships?.role_title) : 'Unknown Position';
        const company = jobInfo?.company || 'Unknown Company';
        const location = jobInfo ? (app.jobs?.city || app.internships?.location) : 'Unknown Location';
        const isConfirming = confirmingIds.has(app.id);

        return (
          <Card key={app.id} className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-900/20">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{title}</CardTitle>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                    <div className="flex items-center gap-1">
                      <Building className="h-4 w-4" />
                      <span>{company}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span>{location}</span>
                    </div>
                  </div>
                </div>
                <Badge variant="outline" className="border-amber-400 text-amber-700 dark:text-amber-300">
                  <Clock className="h-3 w-3 mr-1" />
                  Pending
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Clicked {format(new Date(app.clicked_at), 'MMM d, yyyy \'at\' h:mm a')}
                </p>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => dismissPending(app.id)}
                    disabled={isConfirming}
                  >
                    Dismiss
                  </Button>
                  <Button
                    onClick={() => confirmApplication(app.id)}
                    disabled={isConfirming}
                    size="sm"
                    className="gap-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    {isConfirming ? 'Confirming...' : 'Yes, I Applied'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}