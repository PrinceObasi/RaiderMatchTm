import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CurateInternships } from "@/components/CurateInternships";

interface EnrichmentResult {
  success: boolean;
  scanned: number;
  enriched: number;
  skipped: number;
  sample: Array<{
    id: string;
    company: string;
    role: string;
    summary_text: string;
    tech_stack: string[];
    core_requirements: string[];
  }>;
}

interface DisplayEnrichResult {
  success: boolean;
  scanned: number;
  updated: number;
  skipped: number;
  sample: Array<{
    id: string;
    company: string;
    role: string;
    summary_text: string;
    tech_stack: string[];
    work_mode: string | null;
  }>;
}

const getWorkModeBadgeColor = (mode: string | null) => {
  if (!mode) return 'secondary';
  if (mode === 'remote') return 'default';
  if (mode === 'hybrid') return 'outline';
  return 'secondary';
};

export default function EnrichAdmin({ onBack }: { onBack: () => void }) {
  const [limit, setLimit] = useState(200);
  const [useLlm, setUseLlm] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [result, setResult] = useState<EnrichmentResult | null>(null);
  const { toast } = useToast();

  // Display enrichment states
  const [force, setForce] = useState(false);
  const [isDisplayEnriching, setIsDisplayEnriching] = useState(false);
  const [displayResult, setDisplayResult] = useState<DisplayEnrichResult | null>(null);

  const handleEnrich = async () => {
    setIsEnriching(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('enrich-internships', {
        body: { limit, use_llm: useLlm }
      });

      if (error) throw error;

      setResult(data);
      toast({
        title: "Enrichment Complete",
        description: `Successfully enriched ${data.enriched} of ${data.scanned} internships`,
      });
    } catch (error: any) {
      console.error('Enrichment error:', error);
      toast({
        title: "Enrichment Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsEnriching(false);
    }
  };

  const handleDisplayEnrich = async () => {
    setIsDisplayEnriching(true);
    setDisplayResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('enrich-display', {
        body: { limit, force }
      });
      if (error) throw error;
      setDisplayResult(data as DisplayEnrichResult);
      toast({ title: 'Display Enrichment Complete', description: `Updated ${data.updated} of ${data.scanned} internships` });
    } catch (error: any) {
      console.error('Display enrichment error:', error);
      toast({ title: 'Display Enrichment Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsDisplayEnriching(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <Button
        variant="ghost"
        onClick={onBack}
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Admin
      </Button>

      <div className="space-y-6">
        <CurateInternships />
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Enrich Internships
            </CardTitle>
            <CardDescription>
              Batch process internships to extract summaries, tech stacks, and core requirements
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="limit">Batch Limit</Label>
                <Input
                  id="limit"
                  type="number"
                  value={limit}
                  onChange={(e) => setLimit(parseInt(e.target.value))}
                  min={1}
                  max={1000}
                />
              </div>
              <div className="flex items-end">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="use_llm"
                    checked={useLlm}
                    onCheckedChange={(checked) => setUseLlm(checked as boolean)}
                  />
                  <Label htmlFor="use_llm" className="cursor-pointer">
                    Use LLM refinement (slower, costs apply)
                  </Label>
                </div>
              </div>
            </div>

            <Button
              onClick={handleEnrich}
              disabled={isEnriching}
              className="w-full"
              size="lg"
            >
              {isEnriching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enriching...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Run Enrichment
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Display Enrichment Tool */}
        <Card>
          <CardHeader>
            <CardTitle>Display Enrichment</CardTitle>
            <CardDescription>
              Fill summary_text, tech_stack, and work_mode for display. Uses the same batch limit as above.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="force_display"
                checked={force}
                onCheckedChange={(checked) => setForce(checked as boolean)}
              />
              <Label htmlFor="force_display" className="cursor-pointer">
                Force re-enrichment (overwrite existing data)
              </Label>
            </div>
            <Button onClick={handleDisplayEnrich} disabled={isDisplayEnriching} className="w-full">
              {isDisplayEnriching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Run Display Enrichment'
              )}
            </Button>

            {displayResult && (
              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                    <div className="text-3xl font-bold text-green-600 dark:text-green-400">{displayResult.updated}</div>
                    <div className="text-sm text-muted-foreground">Updated</div>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                    <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{displayResult.skipped}</div>
                    <div className="text-sm text-muted-foreground">Skipped</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{displayResult.scanned}</div>
                    <div className="text-sm text-muted-foreground">Scanned</div>
                  </div>
                </div>

                {displayResult.sample.length > 0 && (
                  <div className="space-y-3 mt-4">
                    <h3 className="font-semibold text-sm">Sample Results (first 5)</h3>
                    {displayResult.sample.map((item) => (
                      <Card key={item.id} className="p-4">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-semibold">{item.role}</h4>
                              <p className="text-sm text-muted-foreground">{item.company}</p>
                            </div>
                            {item.work_mode && (
                              <Badge variant={getWorkModeBadgeColor(item.work_mode)}>
                                {item.work_mode === 'in-person' ? 'In Person' : 
                                 item.work_mode === 'remote' ? 'Remote' : 'Hybrid'}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm">
                            {item.summary_text.slice(0, 220)}
                            {item.summary_text.length > 220 ? '...' : ''}
                          </p>
                          {item.tech_stack.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {item.tech_stack.slice(0, 3).map((tech) => (
                                <Badge key={tech} variant="secondary" className="text-xs">
                                  {tech}
                                </Badge>
                              ))}
                              {item.tech_stack.length > 3 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{item.tech_stack.length - 3}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {result && (
          <Card>
            <CardHeader>
              <CardTitle>Results</CardTitle>
              <CardDescription>
                Processed {result.scanned} internships
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {result.enriched}
                  </div>
                  <div className="text-sm text-muted-foreground">Enriched</div>
                </div>
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {result.scanned}
                  </div>
                  <div className="text-sm text-muted-foreground">Scanned</div>
                </div>
                <div className="text-center p-4 bg-orange-50 dark:bg-orange-950 rounded-lg">
                  <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                    {result.skipped}
                  </div>
                  <div className="text-sm text-muted-foreground">Skipped</div>
                </div>
              </div>

              {result.sample && result.sample.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-semibold">Sample Results (5 shown)</h3>
                  {result.sample.map((item) => (
                    <Card key={item.id}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">{item.role}</CardTitle>
                        <CardDescription>{item.company}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          {item.summary_text}
                        </p>
                        {item.tech_stack.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {item.tech_stack.slice(0, 6).map((tech) => (
                              <Badge key={tech} variant="secondary" className="text-xs">
                                {tech}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {item.core_requirements.length > 0 && (
                          <div className="text-xs space-y-1 text-muted-foreground">
                            <div className="font-semibold">Key Requirements:</div>
                            <ul className="list-disc list-inside">
                              {item.core_requirements.slice(0, 4).map((req, idx) => (
                                <li key={idx}>{req}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
