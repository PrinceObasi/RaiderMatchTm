import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export const TriggerScraper = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [enrichResult, setEnrichResult] = useState<any>(null);

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

  const handleEnrich = async () => {
    setIsEnriching(true);
    setEnrichResult(null);
    try {
      console.log('Triggering batch enrichment...');
      
      const { data, error } = await supabase.functions.invoke('enrich-missing', {
        body: {}
      });

      if (error) {
        console.error('Enrichment error:', error);
        toast.error('Enrichment failed: ' + error.message);
        return;
      }

      console.log('Enrichment result:', data);
      setEnrichResult(data);
      
      if (data?.processed > 0) {
        toast.success(`Enrichment batch complete! 
          Processed: ${data.processed}, 
          Successful: ${data.successful}, 
          Failed: ${data.failed}`);
      } else {
        toast.info('No internships to enrich');
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error('Unexpected error occurred');
    } finally {
      setIsEnriching(false);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-bold">Admin Tools</h2>
      
      <div className="space-y-3">
        <Button 
          onClick={handleScrape} 
          disabled={isLoading || isEnriching}
          className="w-full"
        >
          {isLoading ? 'Scraping...' : 'Run SimplifyJobs Scraper'}
        </Button>

        <Button 
          onClick={handleEnrich} 
          disabled={isEnriching || isLoading}
          className="w-full"
          variant="secondary"
        >
          {isEnriching ? 'Enriching 20 internships...' : 'AI Enrich 20 Internships (New Format)'}
        </Button>
      </div>

      {enrichResult && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="font-semibold mb-2 text-green-900">Enrichment Results:</h3>
          <div className="text-sm space-y-1 text-green-800">
            <p>✓ Processed: {enrichResult.processed}</p>
            <p>✓ Successful: {enrichResult.successful}</p>
            {enrichResult.failed > 0 && <p>✗ Failed: {enrichResult.failed}</p>}
          </div>
          
          {enrichResult.results && enrichResult.results.length > 0 && (
            <div className="mt-4 space-y-2">
              <h4 className="font-semibold text-sm text-green-900">Detailed Results:</h4>
              <div className="max-h-60 overflow-y-auto space-y-1">
                {enrichResult.results.map((result: any, idx: number) => (
                  <div key={idx} className={`text-xs p-2 rounded ${result.success ? 'bg-green-100' : 'bg-red-100'}`}>
                    <span className={result.success ? 'text-green-700' : 'text-red-700'}>
                      {result.success ? '✓' : '✗'} {result.id}
                      {result.error && <span className="ml-2 text-red-600">- {result.error}</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

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