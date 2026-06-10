import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Users, 
  TrendingUp, 
  Building, 
  Code,
  Activity,
  Calendar,
  Target,
  Award
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AnalyticsData {
  totalStudents: number;
  totalApplications: number;
  applicationRate: number;
  signupGrowth: Array<{ date: string; count: number }>;
  topSkills: Array<{ skill: string; count: number }>;
  topCompanies: Array<{ company: string; count: number }>;
  recentSignups: number;
  activeUsers: number;
}

export function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // Fetch total students
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, created_at, skills');
      
      if (studentsError) throw studentsError;

      // Fetch total applications  
      const { data: applicationsData, error: applicationsError } = await supabase
        .from('applications')
        .select('id, applied_at, job_id')
        .not('applied_at', 'is', null);

      if (applicationsError) throw applicationsError;

      // Fetch jobs for company analysis
      const { data: jobsData, error: jobsError } = await supabase
        .from('jobs')
        .select('id, company, title, skills');

      if (jobsError) throw jobsError;

      // Process signup growth (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const signupGrowth: { date: string; count: number }[] = [];
      const signupsByDate: Record<string, number> = {};
      
      studentsData?.forEach(student => {
        const date = new Date(student.created_at).toISOString().split('T')[0];
        signupsByDate[date] = (signupsByDate[date] || 0) + 1;
      });

      // Fill in missing dates with 0
      for (let i = 30; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        signupGrowth.push({
          date: dateStr,
          count: signupsByDate[dateStr] || 0
        });
      }

      // Analyze top skills
      const skillCounts: Record<string, number> = {};
      studentsData?.forEach(student => {
        if (student.skills) {
          student.skills.forEach(skill => {
            skillCounts[skill] = (skillCounts[skill] || 0) + 1;
          });
        }
      });

      const topSkills = Object.entries(skillCounts)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 10)
        .map(([skill, count]) => ({ skill, count: count as number }));

      // Analyze top companies (by application volume)
      const companyApplications: Record<string, number> = {};
      applicationsData?.forEach((app) => {
        const job = jobsData?.find((j) => j.id === app.job_id);
        if (job) {
          companyApplications[job.company] = (companyApplications[job.company] || 0) + 1;
        }
      });

      const topCompanies = Object.entries(companyApplications)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 10)
        .map(([company, count]) => ({ company, count: count as number }));

      // Calculate recent signups (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentSignups = studentsData?.filter(student => 
        new Date(student.created_at) > sevenDaysAgo
      ).length || 0;

      // Calculate application rate
      const totalStudents = studentsData?.length || 0;
      const totalApplications = applicationsData?.length || 0;
      const applicationRate = totalStudents > 0 ? (totalApplications / totalStudents) * 100 : 0;

      setAnalytics({
        totalStudents,
        totalApplications,
        applicationRate,
        signupGrowth,
        topSkills,
        topCompanies,
        recentSignups,
        activeUsers: totalStudents // For now, assume all registered users are "active"
      });

    } catch (error) {
      console.error('Analytics fetch error:', error);
      toast({
        title: "Failed to load analytics",
        description: "Unable to fetch analytics data.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <Activity className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-lg text-gray-600">No analytics data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        <Badge variant="secondary" className="text-sm">
          Last updated: {new Date().toLocaleDateString()}
        </Badge>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalStudents.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              +{analytics.recentSignups} this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalApplications.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Across all internships
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Application Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.applicationRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Students who applied
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.activeUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Registered users
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="growth" className="space-y-4">
        <TabsList>
          <TabsTrigger value="growth">Signup Growth</TabsTrigger>
          <TabsTrigger value="skills">Top Skills</TabsTrigger>
          <TabsTrigger value="companies">Top Companies</TabsTrigger>
        </TabsList>

        <TabsContent value="growth" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Daily Signups (Last 30 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {analytics.signupGrowth.slice(-7).map((day, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm">{new Date(day.date).toLocaleDateString()}</span>
                    <Badge variant={day.count > 0 ? "default" : "secondary"}>
                      {day.count} signups
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="skills" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Most Popular Skills
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.topSkills.map((skill, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-primary">#{index + 1}</span>
                      </div>
                      <span className="font-medium">{skill.skill}</span>
                    </div>
                    <Badge variant="outline">
                      {skill.count} students
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="companies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Companies by Application Volume
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.topCompanies.map((company, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        {index < 3 ? (
                          <Award className="h-4 w-4 text-green-600" />
                        ) : (
                          <Building className="h-4 w-4 text-gray-600" />
                        )}
                      </div>
                      <span className="font-medium">{company.company}</span>
                    </div>
                    <Badge variant={index < 3 ? "default" : "secondary"}>
                      {company.count} applications
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}