import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const TriggerSimplifyDiscovery = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleScrape = async () => {
    setIsLoading(true);
    setResult(null);
    try {
      console.log('Triggering simplify-discovery function...');
      
      const { data, error } = await supabase.functions.invoke('simplify-discovery', {
        body: {}
      });

      if (error) {
        console.error('Discovery scraper error:', error);
        toast.error('Discovery scraper failed: ' + error.message);
        return;
      }

      console.log('Discovery scraper result:', data);
      setResult(data);
      
      if (data?.success) {
        toast.success(`Discovery complete! 
          Found: ${data.totalInserted || 0} direct links
          Direct: ${data.directLinksFound || 0}
          Fallback: ${data.fallbacksUsed || 0}
          Texas: ${data.texasJobs || 0}`);
      } else {
        toast.error('Discovery completed with errors');
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error('Unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>SimplifyJobs Discovery Scraper</CardTitle>
        <CardDescription>
          Uses SimplifyJobs to discover companies, then finds direct application links on their career pages (Greenhouse, Lever, Workday, etc.)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={handleScrape} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? 'Discovering & Scraping...' : 'Run Discovery Scraper'}
        </Button>

        {result && (
          <div className="mt-4 p-4 bg-secondary rounded-lg">
            <h3 className="font-semibold mb-2">Results:</h3>
            {result.topCompanies && (
              <div className="mb-3">
                <h4 className="text-sm font-medium mb-1">Top Companies:</h4>
                <ul className="text-sm space-y-1">
                  {result.topCompanies.map((item: any) => (
                    <li key={item.company}>
                      {item.company}: {item.count} positions
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <pre className="text-sm overflow-auto max-h-96">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
