import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
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

    const body = await req.json().catch(() => ({}))
    const limit: number = body.limit ?? 30

    console.log('Starting batch enrichment process')

    // Use the SQL function to get candidates (already filters active + < 3 attempts)
    const { data: internships, error: fetchError } = await supabaseClient
      .rpc('get_internships_needing_enrichment', { p_limit: limit })

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
    let processed = 0
    let archived = 0
    let aiErrors = 0
    let enriched = 0
    
    for (const internship of internships) {
      processed += 1
      
      try {
        console.log(`Processing internship ${internship.id}`)
        
        const response = await supabaseClient.functions.invoke('enrich-internship', {
          body: { id: internship.id }
        })

        if (response.error) {
          console.log(`HTTP error for ${internship.id}: ${response.error.message}`)
          aiErrors += 1
        } else if (response.data?.archived) {
          console.log(`Archived ${internship.id} as job closed`)
          archived += 1
        } else if (response.data?.ok) {
          console.log(`Successfully enriched ${internship.id}`)
          enriched += 1
        } else {
          console.log(`AI error for ${internship.id}: ${response.data?.reason}`)
          aiErrors += 1
        }

        // 2-second delay to avoid overwhelming ATS/AI
        await sleep(2000)
      } catch (error) {
        console.error(`Error processing ${internship.id}:`, error)
        aiErrors += 1
        await sleep(2000)
      }
    }
    
    console.log(`Batch complete: ${enriched} enriched, ${archived} archived, ${aiErrors} errors`)
    
    return new Response(
      JSON.stringify({
        status: 'completed',
        processed,
        enriched,
        archived,
        ai_errors: aiErrors
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