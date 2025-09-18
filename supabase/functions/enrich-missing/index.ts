import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Starting batch enrichment process')

    // Get internships that haven't been enriched
    const { data: internships, error: fetchError } = await supabaseClient
      .from('internships')
      .select('id, application_link')
      .is('jd_summary', null)
      .not('application_link', 'is', null)
      .limit(10) // Process in small batches to avoid timeouts

    if (fetchError) {
      console.error('Fetch error:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch internships' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!internships || internships.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No internships to enrich' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Processing ${internships.length} internships`)

    // Process each internship
    const results = []
    
    for (const internship of internships) {
      try {
        console.log(`Processing internship ${internship.id}`)
        
        const response = await supabaseClient.functions.invoke('enrich-internship', {
          body: { id: internship.id }
        })

        results.push({
          id: internship.id,
          success: !response.error,
          error: response.error?.message || null
        })

        // Add small delay to avoid overwhelming external servers
        await new Promise(resolve => setTimeout(resolve, 2000))
      } catch (error) {
        console.error(`Error processing ${internship.id}:`, error)
        results.push({
          id: internship.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    
    console.log(`Batch complete: ${successCount}/${results.length} successful`)
    
    return new Response(
      JSON.stringify({
        processed: results.length,
        successful: successCount,
        failed: results.length - successCount,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Batch enrichment error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})