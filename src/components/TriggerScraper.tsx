import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export const TriggerScraper = () => {
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
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-bold">SimplifyJobs Scraper</h2>
      
      <Button 
        onClick={handleScrape} 
        disabled={isLoading}
        className="w-full"
      >
        {isLoading ? 'Scraping...' : 'Run SimplifyJobs Scraper'}
      </Button>

      {result && (
        <div className="mt-4 p-4 bg-secondary rounded-lg">
          <h3 className="font-semibold mb-2">Scraper Results:</h3>
          <pre className="text-sm overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};