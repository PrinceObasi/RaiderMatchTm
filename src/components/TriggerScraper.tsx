import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TriggerUniversalScraper } from './TriggerUniversalScraper';
import { TriggerSimplifyDiscovery } from './TriggerSimplifyDiscovery';
import { ArrowLeft } from 'lucide-react';

interface TriggerScraperProps {
  onBack?: () => void;
}

export const TriggerScraper = ({ onBack }: TriggerScraperProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleScrape = async () => {
    setIsLoading(true);
    try {
      console.log('Triggering scrape-simplify function...');
      
      const { data, error } = await supabase.functions.invoke('scrape-simplify', {
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
        toast.success(`Scraper completed! 
          Parsed: ${data.parsed || 0}, 
          Relevant: ${data.relevant || 0}, 
          Inserted: ${data.inserted || 0}, 
          Skipped: ${data.skipped || 0}`);
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
    <div className="container mx-auto p-6 space-y-6">
      {onBack && (
        <Button 
          onClick={onBack} 
          variant="ghost" 
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      )}
      
      <h1 className="text-3xl font-bold mb-6">Data Scrapers</h1>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <TriggerSimplifyDiscovery />
        
        <TriggerUniversalScraper />
        
        <Card>
          <CardHeader>
            <CardTitle>SimplifyJobs GitHub Scraper</CardTitle>
            <CardDescription>
              Scrapes internship data from the SimplifyJobs GitHub repository (redirect links)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={handleScrape} 
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? 'Scraping...' : 'Run SimplifyJobs Scraper'}
            </Button>

            {result && (
              <div className="mt-4 p-4 bg-secondary rounded-lg">
                <h3 className="font-semibold mb-2">Results:</h3>
                <pre className="text-sm overflow-auto max-h-64">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};