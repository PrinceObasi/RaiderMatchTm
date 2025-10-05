import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const TriggerUniversalScraper = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleScrape = async () => {
    setIsLoading(true);
    setResult(null);
    
    try {
      console.log('Triggering Universal ATS scraper...');
      
      const { data, error } = await supabase.functions.invoke('scrape-universal-ats', {
        body: {}
      });

      if (error) {
        console.error('Scraper error:', error);
        toast.error('Scraper failed: ' + error.message);
        return;
      }

      console.log('Scraper result:', data);
      setResult(data);
      
      if (data?.success) {
        toast.success(`Universal ATS Scraper completed! 
          Scraped: ${data.jobsScraped || 0}, 
          Unique: ${data.uniqueJobs || 0}, 
          Inserted: ${data.inserted || 0}, 
          Skipped: ${data.skipped || 0},
          Texas Jobs: ${data.texasJobs || 0}`);
      } else {
        toast.error('Scraper completed with errors');
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
        <CardTitle>Universal ATS Scraper</CardTitle>
        <CardDescription>
          Scrapes direct application links from major ATS platforms (Greenhouse, Lever, Workday, SmartRecruiters)
          for top tech companies.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={handleScrape} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? 'Scraping...' : 'Run Universal ATS Scraper'}
        </Button>

        {result && (
          <div className="mt-4 p-4 bg-secondary rounded-lg space-y-2">
            <h3 className="font-semibold mb-2">Scraper Results:</h3>
            
            {result.success ? (
              <div className="space-y-1 text-sm">
                <p>✅ Total jobs scraped: <strong>{result.jobsScraped}</strong></p>
                <p>✅ Unique jobs: <strong>{result.uniqueJobs}</strong></p>
                <p>✅ Inserted into DB: <strong>{result.inserted}</strong></p>
                <p>⚠️ Skipped (duplicates): <strong>{result.skipped}</strong></p>
                <p>📍 Texas jobs: <strong>{result.texasJobs}</strong></p>
                <p>✅ Companies successful: <strong>{result.companiesSuccess}</strong></p>
                <p>❌ Companies failed: <strong>{result.companiesFailed}</strong></p>
                
                {result.companies && result.companies.length > 0 && (
                  <div className="mt-2">
                    <p className="font-semibold">Companies with internships:</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {result.companies.map((company: string) => (
                        <span key={company} className="px-2 py-1 bg-primary/10 rounded text-xs">
                          {company}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-destructive">Error: {result.error}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
