import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const [isEnriching, setIsEnriching] = useState(false);

  const runEnrichment = async () => {
    setIsEnriching(true);
    try {
      const { data, error } = await supabase.functions.invoke('enrich-display', {
        body: { limit: 25, force: true }
      });

      if (error) {
        console.error('ENRICH_CALL_ERROR', error);
        toast.error(`Enrichment failed: ${error.message}`);
      } else {
        console.log('ENRICH_CALL_SUCCESS', data);
        toast.success(`Enriched ${data?.updated} of ${data?.scanned} internships in ${data?.duration_ms}ms`);
      }
    } catch (err: any) {
      console.error('ENRICH_CALL_EXCEPTION', err);
      toast.error(`Failed: ${err.message}`);
    } finally {
      setIsEnriching(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold mb-4">Welcome to Your Blank App</h1>
        <p className="text-xl text-muted-foreground">Start building your amazing project here!</p>
        
        <Button 
          onClick={runEnrichment} 
          disabled={isEnriching}
          className="mt-6"
        >
          {isEnriching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Run Display Enrichment (25 / force)
        </Button>
      </div>
    </div>
  );
};

export default Index;
