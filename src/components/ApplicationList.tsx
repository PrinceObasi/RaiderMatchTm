import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface Application {
  id: string;
  applied_at: string;
  status: string;
  jobs: {
    title: string;
    company: string;
    city: string;
  };
}

export function ApplicationList() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchApplications = async () => {
      const { data, error } = await supabase
        .from('applications')
        .select(`
          id,
          applied_at,
          status,
          jobs!job_id (
            title,
            company,
            city
          )
        `)
        .order('applied_at', { ascending: false });

      if (!error) {
        setApplications(data || []);
      }
      setLoading(false);
    };

    fetchApplications();
  }, []);

  if (loading) {
    return <div className="text-center py-8">Loading applications...</div>;
  }

  if (applications.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg mb-2">No applications yet</p>
        <p>Apply to some internships to see them here!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {applications.map((app) => (
        <Card key={app.id} className="border hover:shadow-md transition-smooth">
          <CardHeader className="flex flex-row items-start justify-between pb-2">
            <div className="flex-1">
              <h3 className="text-lg font-semibold">{app.jobs.title}</h3>
              <p className="text-sm text-muted-foreground">
                {app.jobs.company} • {app.jobs.city}
              </p>
            </div>
            <Badge variant={app.status === 'applied' ? 'default' : 'secondary'}>
              {app.status}
            </Badge>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground">
              Applied {format(new Date(app.applied_at), 'MMM d, yyyy')}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}