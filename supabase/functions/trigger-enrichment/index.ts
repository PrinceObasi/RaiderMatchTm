import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ENRICH_URL = Deno.env.get('ENRICH_URL');
    const ENRICH_SHARED_SECRET = Deno.env.get('ENRICH_SHARED_SECRET');

    if (!ENRICH_URL) {
      console.error('ENRICH_URL not configured');
      return new Response(
        JSON.stringify({ error: 'Enricher service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!ENRICH_SHARED_SECRET) {
      console.error('ENRICH_SHARED_SECRET not configured');
      return new Response(
        JSON.stringify({ error: 'Shared secret not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { limit = 80 } = await req.json().catch(() => ({ limit: 80 }));

    console.log(`Triggering enrichment batch with limit: ${limit}`);

    const enrichResponse = await fetch(`${ENRICH_URL}/enrichBatch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-raider-secret': ENRICH_SHARED_SECRET,
      },
      body: JSON.stringify({ limit }),
    });

    if (!enrichResponse.ok) {
      const errorText = await enrichResponse.text();
      console.error('Enricher service error:', enrichResponse.status, errorText);
      return new Response(
        JSON.stringify({ 
          error: 'Enricher service failed',
          status: enrichResponse.status,
          details: errorText 
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await enrichResponse.json();
    console.log('Enrichment result:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in trigger-enrichment:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
