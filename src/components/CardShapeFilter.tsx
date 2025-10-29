import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Filter, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function CardShapeFilter() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<any>(null);

  const runFilter = async () => {
    setIsRunning(true);
    setResults(null);

    try {
      const { data, error } = await supabase.functions.invoke('filter-card-shape', {
        body: {}
      });

      if (error) throw error;

      setResults(data);
      toast.success(`Filter complete! Kept ${data.totalKept}, archived ${data.totalArchived}`);
    } catch (error: any) {
      console.error('Filter error:', error);
      toast.error(error.message || 'Failed to run filter');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Card-Shape Filter
        </CardTitle>
        <CardDescription>
          Scans all active internships and archives those that don't match the exact card format:
          single location, quality 2-3 sentence summary with action verbs, and 6-10 canonical tech tags.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runFilter} 
          disabled={isRunning}
          className="w-full"
        >
          {isRunning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Scanning Internships...
            </>
          ) : (
            <>
              <Filter className="mr-2 h-4 w-4" />
              Run Card-Shape Filter
            </>
          )}
        </Button>

        {results && (
          <Alert>
            <AlertDescription className="space-y-2">
              <div className="font-semibold">Filter Results:</div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Processed</div>
                  <div className="text-lg font-bold">{results.totalProcessed}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Kept</div>
                  <div className="text-lg font-bold text-green-600">{results.totalKept}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Archived</div>
                  <div className="text-lg font-bold text-orange-600">{results.totalArchived}</div>
                </div>
              </div>
              
              {results.archiveReasons && Object.keys(results.archiveReasons).length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <div className="font-semibold mb-2">Top Archive Reasons:</div>
                  <div className="space-y-1 text-sm">
                    {Object.entries(results.archiveReasons)
                      .sort((a: any, b: any) => b[1] - a[1])
                      .slice(0, 10)
                      .map(([reason, count]: any) => (
                        <div key={reason} className="flex justify-between">
                          <span className="text-muted-foreground">{reason}</span>
                          <span className="font-medium">{count}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
