import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Sparkles } from 'lucide-react';

export function CurateInternships() {
  const [isRunning, setIsRunning] = useState(false);
  const [targetCount, setTargetCount] = useState(225);
  const [result, setResult] = useState<any>(null);

  const runCuration = async () => {
    setIsRunning(true);
    setResult(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('curate-top-internships', {
        body: { targetCount }
      });

      if (error) throw error;

      setResult(data);
      toast.success(`Curated to top ${data.kept} internships! Archived ${data.archived}.`);
    } catch (error) {
      console.error('Curation error:', error);
      toast.error('Failed to curate internships');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Curate Top Internships
        </CardTitle>
        <CardDescription>
          Keep only the highest-quality internships with valid descriptions, tech stacks, and working links
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="targetCount">Target Count</Label>
          <Input
            id="targetCount"
            type="number"
            min="50"
            max="500"
            value={targetCount}
            onChange={(e) => setTargetCount(parseInt(e.target.value) || 225)}
          />
          <p className="text-sm text-muted-foreground">
            Number of top internships to keep (200-250 recommended)
          </p>
        </div>

        <Button 
          onClick={runCuration} 
          disabled={isRunning}
          className="w-full"
        >
          {isRunning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Curating...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Run Curation
            </>
          )}
        </Button>

        {result && (
          <div className="mt-4 space-y-4">
            <div className="rounded-lg border p-4 space-y-2">
              <h3 className="font-semibold">Results</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Kept:</div>
                <div className="font-mono">{result.kept}</div>
                <div>Archived:</div>
                <div className="font-mono">{result.archived}</div>
              </div>
            </div>

            <div className="rounded-lg border p-4 space-y-2">
              <h3 className="font-semibold">Score Distribution</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>80-100 (Excellent):</div>
                <div className="font-mono">{result.scoreDistribution['80-100']}</div>
                <div>60-79 (Good):</div>
                <div className="font-mono">{result.scoreDistribution['60-79']}</div>
                <div>40-59 (Fair):</div>
                <div className="font-mono">{result.scoreDistribution['40-59']}</div>
                <div>0-39 (Poor):</div>
                <div className="font-mono">{result.scoreDistribution['0-39']}</div>
              </div>
            </div>

            {result.topScores && (
              <div className="rounded-lg border p-4 space-y-2">
                <h3 className="font-semibold text-sm">Top 10 Scores</h3>
                <div className="space-y-2 text-xs">
                  {result.topScores.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between">
                      <span className="truncate flex-1">{item.company} - {item.role}</span>
                      <span className="font-mono ml-2">{item.score}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
