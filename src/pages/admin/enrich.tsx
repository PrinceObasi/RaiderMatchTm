import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Zap, Download } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EnrichedInternshipCard } from "@/components/EnrichedInternshipCard";

interface BatchResult {
  processed: number;
  successful: number;
  failed: number;
  results: Array<{
    id: string;
    success: boolean;
    error?: string;
  }>;
}

interface ScrapeResult {
  parsed: number;
  inserted: number;
  skipped: number;
}

interface EnrichAdminPageProps {
  onBack: () => void;
}

export default function EnrichAdminPage({ onBack }: EnrichAdminPageProps) {
  const [isEnrichingBatch, setIsEnrichingBatch] = useState(false);
  const [batchResult, setBatchResult] = useState<BatchResult | null>(null);
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeResult, setScrapeResult] = useState<ScrapeResult | null>(null);
  const { toast } = useToast();

  // Fetch internships for display
  const { data: internships, refetch } = useQuery({
    queryKey: ['admin-internships'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('internships')
        .select(`
          id, company, role_title, location, tech_stack, visa_sponsorship,
          application_link, date_posted, deadline, jd_summary, salary_min,
          salary_max, salary_period, enriched_at
        `)
        .order('date_posted', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
  });

  // Count unenriched internships
  const { data: unenrichedCount } = useQuery({
    queryKey: ['unenriched-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('internships')
        .select('*', { count: 'exact', head: true })
        .is('jd_summary', null)
        .not('application_link', 'is', null);

      if (error) throw error;
      return count;
    },
  });

  const handleBatchEnrich = async () => {
    setIsEnrichingBatch(true);
    setBatchResult(null);
    
    try {
      const response = await supabase.functions.invoke('enrich-missing', {});
      
      if (!response.error) {
        setBatchResult(response.data);
        toast({
          title: "Batch Enrichment Complete",
          description: `Successfully enriched ${response.data.successful} of ${response.data.processed} internships.`,
        });
        refetch();
      } else {
        toast({
          title: "Batch Enrichment Failed",
          description: response.error.message || "Failed to enrich internships",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to run batch enrichment",
        variant: "destructive",
      });
    } finally {
      setIsEnrichingBatch(false);
    }
  };

  const handleScrapeSimplifyJobs = async () => {
    setIsScraping(true);
    setScrapeResult(null);
    
    try {
      const response = await supabase.functions.invoke('scrape-simplify', {});
      
      if (!response.error) {
        setScrapeResult(response.data);
        toast({
          title: "SimplifyJobs Scrape Complete",
          description: `Parsed ${response.data.parsed} jobs, inserted ${response.data.inserted} new ones.`,
        });
        refetch();
      } else {
        toast({
          title: "SimplifyJobs Scrape Failed",
          description: response.error.message || "Failed to scrape SimplifyJobs",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to run SimplifyJobs scraper",
        variant: "destructive",
      });
    } finally {
      setIsScraping(false);
    }
  };

  const handleApply = (internship: any) => {
    window.open(internship.application_link, '_blank');
  };

  return (
    <div className="container mx-auto py-8 px-4">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Job Enrichment Admin</h1>
            <Button variant="outline" onClick={onBack}>
              ← Back to Main
            </Button>
          </div>
          <p className="text-muted-foreground">Manage and enrich job posting data</p>

        {/* Stats and Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Unenriched Jobs</CardTitle>
              <CardDescription>Jobs without detailed descriptions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {unenrichedCount ?? <Loader2 className="h-6 w-6 animate-spin" />}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Batch Actions</CardTitle>
              <CardDescription>Enrich multiple jobs at once</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleBatchEnrich}
                disabled={isEnrichingBatch || !unenrichedCount}
                className="w-full"
              >
                {isEnrichingBatch ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Zap className="h-4 w-4 mr-2" />
                )}
                Enrich Missing (10)
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">SimplifyJobs</CardTitle>
              <CardDescription>Scrape latest internships from SimplifyJobs</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleScrapeSimplifyJobs}
                disabled={isScraping}
                className="w-full"
              >
                {isScraping ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Scrape SimplifyJobs
              </Button>
            </CardContent>
          </Card>

          {scrapeResult && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Last Scrape Result</CardTitle>
                <CardDescription>Results from the last SimplifyJobs scrape</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex gap-2">
                  <Badge variant="default">{scrapeResult.inserted} Inserted</Badge>
                  <Badge variant="secondary">{scrapeResult.skipped} Skipped</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Parsed {scrapeResult.parsed} jobs from SimplifyJobs
                </p>
              </CardContent>
            </Card>
          )}

          {batchResult && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Last Batch Result</CardTitle>
                <CardDescription>Results from the last enrichment run</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex gap-2">
                  <Badge variant="default">{batchResult.successful} Success</Badge>
                  {batchResult.failed > 0 && (
                    <Badge variant="destructive">{batchResult.failed} Failed</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Processed {batchResult.processed} jobs
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Job Listings */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Recent Jobs</h2>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          <div className="grid gap-4">
            {internships?.map((internship) => (
              <EnrichedInternshipCard
                key={internship.id}
                internship={internship}
                onApply={handleApply}
                showEnrichButton={true}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}