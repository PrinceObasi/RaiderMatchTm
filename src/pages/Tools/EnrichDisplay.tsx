import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, CheckCircle2, XCircle } from 'lucide-react';

interface EnrichResult {
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

export default function EnrichDisplay() {
  const [limit, setLimit] = useState(300);
  const [force, setForce] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<EnrichResult | null>(null);

  const handleEnrich = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('enrich-display', {
        body: { limit, force }
      });

      if (error) throw error;

      setResult(data);
      toast.success(`Enriched ${data.updated} internships successfully!`);
    } catch (error) {
      console.error('Enrich error:', error);
      toast.error('Failed to enrich internships: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const getWorkModeBadgeColor = (mode: string | null) => {
    if (!mode) return 'secondary';
    if (mode === 'remote') return 'default';
    if (mode === 'hybrid') return 'outline';
    return 'secondary';
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <Button
        variant="ghost"
        onClick={() => window.history.back()}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Display Enrichment Tool</CardTitle>
            <CardDescription>
              Enrich internships with display-ready descriptions, tech stacks, and work modes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="limit">Batch Limit</Label>
              <Input
                id="limit"
                type="number"
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                min={1}
                max={1000}
              />
              <p className="text-sm text-muted-foreground">
                Maximum number of internships to process (default: 300)
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="force"
                checked={force}
                onCheckedChange={(checked) => setForce(checked as boolean)}
              />
              <Label htmlFor="force" className="text-sm font-normal">
                Force re-enrichment (overwrite existing data)
              </Label>
            </div>

            <Button
              onClick={handleEnrich}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Run Display Enrichment'
              )}
            </Button>
          </CardContent>
        </Card>

        {result && (
          <Card>
            <CardHeader>
              <CardTitle>Enrichment Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold">{result.updated}</p>
                    <p className="text-sm text-muted-foreground">Updated</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-yellow-500" />
                  <div>
                    <p className="text-2xl font-bold">{result.skipped}</p>
                    <p className="text-sm text-muted-foreground">Skipped</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5" />
                  <div>
                    <p className="text-2xl font-bold">{result.scanned}</p>
                    <p className="text-sm text-muted-foreground">Scanned</p>
                  </div>
                </div>
              </div>

              {result.sample.length > 0 && (
                <div className="space-y-3 mt-6">
                  <h3 className="font-semibold text-sm">Sample Results (first 5)</h3>
                  {result.sample.map((item) => (
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
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
