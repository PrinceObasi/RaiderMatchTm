import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  BarChart3, 
  TrendingUp, 
  Building, 
  MapPin, 
  RefreshCw,
  Users,
  ExternalLink,
  Calendar
} from "lucide-react";

interface ApplicationStat {
  id: string;
  title?: string;
  company?: string;
  role_title?: string;
  location?: string;
  city?: string;
  application_count: number;
  unique_applicants: number;
  last_applied: string;
}

interface CompanyStat {
  company: string;
  application_count: number;
  unique_roles: number;
  unique_applicants: number;
}

interface LocationStat {
  location: string;
  application_count: number;
  unique_companies: number;
  unique_applicants: number;
}

export function Analytics() {
  const [jobStats, setJobStats] = useState<ApplicationStat[]>([]);
  const [internshipStats, setInternshipStats] = useState<ApplicationStat[]>([]);
  const [companyStats, setCompanyStats] = useState<CompanyStat[]>([]);
  const [locationStats, setLocationStats] = useState<LocationStat[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      // Load job application analytics
      const { data: jobData, error: jobError } = await supabase
        .from('application_clicks')
        .select(`
          job_id,
          apply_url,
          jobs:job_id (
            title,
            company,
            city
          )
        `)
        .not('job_id', 'is', null);

      if (jobError) throw jobError;

      // Load internship application analytics  
      const { data: internshipData, error: internshipError } = await supabase
        .from('application_clicks')
        .select(`
          internship_id,
          apply_url,
          internships:internship_id (
            role_title,
            company,
            location
          )
        `)
        .not('internship_id', 'is', null);

      if (internshipError) throw internshipError;

      // Process job stats
      const jobStatsMap = new Map<string, {
        job: any;
        count: number;
        applicants: Set<string>;
        lastApplied: string;
      }>();

      jobData?.forEach((click: any) => {
        const jobId = click.job_id;
        if (!jobStatsMap.has(jobId)) {
          jobStatsMap.set(jobId, {
            job: click.jobs,
            count: 0,
            applicants: new Set(),
            lastApplied: click.clicked_at
          });
        }
        const stat = jobStatsMap.get(jobId)!;
        stat.count++;
        stat.applicants.add(click.user_id);
        if (click.clicked_at > stat.lastApplied) {
          stat.lastApplied = click.clicked_at;
        }
      });

      const processedJobStats: ApplicationStat[] = Array.from(jobStatsMap.entries())
        .map(([id, stat]) => ({
          id,
          title: stat.job?.title,
          company: stat.job?.company,
          city: stat.job?.city,
          application_count: stat.count,
          unique_applicants: stat.applicants.size,
          last_applied: stat.lastApplied
        }))
        .sort((a, b) => b.application_count - a.application_count);

      // Process internship stats
      const internshipStatsMap = new Map<string, {
        internship: any;
        count: number;
        applicants: Set<string>;
        lastApplied: string;
      }>();

      internshipData?.forEach((click: any) => {
        const internshipId = click.internship_id;
        if (!internshipStatsMap.has(internshipId)) {
          internshipStatsMap.set(internshipId, {
            internship: click.internships,
            count: 0,
            applicants: new Set(),
            lastApplied: click.clicked_at
          });
        }
        const stat = internshipStatsMap.get(internshipId)!;
        stat.count++;
        stat.applicants.add(click.user_id);
        if (click.clicked_at > stat.lastApplied) {
          stat.lastApplied = click.clicked_at;
        }
      });

      const processedInternshipStats: ApplicationStat[] = Array.from(internshipStatsMap.entries())
        .map(([id, stat]) => ({
          id,
          role_title: stat.internship?.role_title,
          company: stat.internship?.company,
          location: stat.internship?.location,
          application_count: stat.count,
          unique_applicants: stat.applicants.size,
          last_applied: stat.lastApplied
        }))
        .sort((a, b) => b.application_count - a.application_count);

      // Process company stats
      const companyStatsMap = new Map<string, {
        count: number;
        roles: Set<string>;
        applicants: Set<string>;
      }>();

      [...(jobData || []), ...(internshipData || [])].forEach((click: any) => {
        const company = click.jobs?.company || click.internships?.company;
        if (!company) return;
        
        if (!companyStatsMap.has(company)) {
          companyStatsMap.set(company, {
            count: 0,
            roles: new Set(),
            applicants: new Set()
          });
        }
        
        const stat = companyStatsMap.get(company)!;
        stat.count++;
        stat.applicants.add(click.user_id);
        
        if (click.jobs) {
          stat.roles.add(click.jobs.title);
        } else if (click.internships) {
          stat.roles.add(click.internships.role_title);
        }
      });

      const processedCompanyStats: CompanyStat[] = Array.from(companyStatsMap.entries())
        .map(([company, stat]) => ({
          company,
          application_count: stat.count,
          unique_roles: stat.roles.size,
          unique_applicants: stat.applicants.size
        }))
        .sort((a, b) => b.application_count - a.application_count);

      // Process location stats
      const locationStatsMap = new Map<string, {
        count: number;
        companies: Set<string>;
        applicants: Set<string>;
      }>();

      [...(jobData || []), ...(internshipData || [])].forEach((click: any) => {
        const location = click.jobs?.city || click.internships?.location;
        if (!location) return;
        
        if (!locationStatsMap.has(location)) {
          locationStatsMap.set(location, {
            count: 0,
            companies: new Set(),
            applicants: new Set()
          });
        }
        
        const stat = locationStatsMap.get(location)!;
        stat.count++;
        stat.applicants.add(click.user_id);
        
        const company = click.jobs?.company || click.internships?.company;
        if (company) {
          stat.companies.add(company);
        }
      });

      const processedLocationStats: LocationStat[] = Array.from(locationStatsMap.entries())
        .map(([location, stat]) => ({
          location,
          application_count: stat.count,
          unique_companies: stat.companies.size,
          unique_applicants: stat.applicants.size
        }))
        .sort((a, b) => b.application_count - a.application_count);

      setJobStats(processedJobStats);
      setInternshipStats(processedInternshipStats);
      setCompanyStats(processedCompanyStats);
      setLocationStats(processedLocationStats);

    } catch (error) {
      console.error('Error loading analytics:', error);
      toast({
        title: "Error loading analytics",
        description: "Failed to load application analytics data.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Application Analytics</h2>
          <p className="text-muted-foreground">
            Track which roles and companies are most popular with students
          </p>
        </div>
        <Button onClick={loadAnalytics} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="roles" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="roles">Top Roles</TabsTrigger>
          <TabsTrigger value="internships">Top Internships</TabsTrigger>
          <TabsTrigger value="companies">Companies</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Most Applied Job Roles
              </CardTitle>
            </CardHeader>
            <CardContent>
              {jobStats.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No job application data available yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {jobStats.slice(0, 10).map((job, index) => (
                    <div key={job.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-lg text-primary">#{index + 1}</span>
                          <h3 className="font-semibold">{job.title}</h3>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <div className="flex items-center gap-1">
                            <Building className="h-4 w-4" />
                            {job.company}
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {job.city}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Last applied: {formatDate(job.last_applied)}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant="secondary" className="font-semibold">
                          {job.application_count} clicks
                        </Badge>
                        <Badge variant="outline">
                          <Users className="h-3 w-3 mr-1" />
                          {job.unique_applicants} students
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="internships" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Most Applied Internships
              </CardTitle>
            </CardHeader>
            <CardContent>
              {internshipStats.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No internship application data available yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {internshipStats.slice(0, 10).map((internship, index) => (
                    <div key={internship.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-lg text-primary">#{index + 1}</span>
                          <h3 className="font-semibold">{internship.role_title}</h3>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <div className="flex items-center gap-1">
                            <Building className="h-4 w-4" />
                            {internship.company}
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {internship.location}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Last applied: {formatDate(internship.last_applied)}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant="secondary" className="font-semibold">
                          {internship.application_count} clicks
                        </Badge>
                        <Badge variant="outline">
                          <Users className="h-3 w-3 mr-1" />
                          {internship.unique_applicants} students
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="companies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Most Popular Companies
              </CardTitle>
            </CardHeader>
            <CardContent>
              {companyStats.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No company application data available yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {companyStats.slice(0, 15).map((company, index) => (
                    <div key={company.company} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg text-primary">#{index + 1}</span>
                        <div>
                          <h3 className="font-semibold">{company.company}</h3>
                          <p className="text-sm text-muted-foreground">
                            {company.unique_roles} different roles available
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant="secondary" className="font-semibold">
                          {company.application_count} total clicks
                        </Badge>
                        <Badge variant="outline">
                          <Users className="h-3 w-3 mr-1" />
                          {company.unique_applicants} students
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="locations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Most Popular Locations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {locationStats.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No location application data available yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {locationStats.slice(0, 15).map((location, index) => (
                    <div key={location.location} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg text-primary">#{index + 1}</span>
                        <div>
                          <h3 className="font-semibold">{location.location}</h3>
                          <p className="text-sm text-muted-foreground">
                            {location.unique_companies} companies hiring here
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant="secondary" className="font-semibold">
                          {location.application_count} total clicks
                        </Badge>
                        <Badge variant="outline">
                          <Users className="h-3 w-3 mr-1" />
                          {location.unique_applicants} students
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}