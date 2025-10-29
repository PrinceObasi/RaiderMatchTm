import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { batch_size = 20 } = await req.json().catch(() => ({ batch_size: 20 }))

    console.log(`Starting re-enrichment of flagged postings (batch size: ${batch_size})`)

    // Fetch internships that need review
    const { data: internships, error: fetchError } = await supabaseClient
      .from('internships')
      .select('id, company, role_title, application_link, review_reason')
      .eq('needs_review', true)
      .eq('is_active', true)
      .not('application_link', 'is', null)
      .limit(batch_size)

    if (fetchError) {
      console.error('Fetch error:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch internships' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${internships?.length || 0} internships to re-enrich`)

    if (!internships || internships.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No internships need re-enrichment',
          processed: 0,
          successful: 0,
          failed: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      details: [] as Array<{ id: string; company: string; role: string; success: boolean; error?: string }>
    }

    // Process each internship
    for (const internship of internships) {
      results.processed++
      
      console.log(`Re-enriching: ${internship.company} - ${internship.role_title}`)
      console.log(`Reasons: ${internship.review_reason?.join(', ') || 'none'}`)

      try {
        // Call the main enrichment function
        const { data, error } = await supabaseClient.functions.invoke('enrich-internship', {
          body: { id: internship.id }
        })

        if (error) {
          console.error(`Enrichment failed for ${internship.id}:`, error)
          results.failed++
          results.details.push({
            id: internship.id,
            company: internship.company,
            role: internship.role_title,
            success: false,
            error: error.message || 'Unknown error'
          })
          continue
        }

        if (!data || !data.ok) {
          console.error(`Enrichment returned error for ${internship.id}:`, data)
          results.failed++
          results.details.push({
            id: internship.id,
            company: internship.company,
            role: internship.role_title,
            success: false,
            error: 'Enrichment returned non-ok status'
          })
          continue
        }

        // Clear review flags
        const { error: updateError } = await supabaseClient
          .from('internships')
          .update({
            needs_review: false,
            review_reason: null
          })
          .eq('id', internship.id)

        if (updateError) {
          console.error(`Failed to clear review flags for ${internship.id}:`, updateError)
        }

        results.successful++
        results.details.push({
          id: internship.id,
          company: internship.company,
          role: internship.role_title,
          success: true
        })

        console.log(`✓ Successfully re-enriched ${internship.company} - ${internship.role_title}`)

      } catch (error) {
        console.error(`Exception during enrichment of ${internship.id}:`, error)
        results.failed++
        results.details.push({
          id: internship.id,
          company: internship.company,
          role: internship.role_title,
          success: false,
          error: (error as Error).message
        })
      }

      // Small delay to avoid overwhelming services
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    console.log(`Re-enrichment complete: ${results.successful} successful, ${results.failed} failed`)

    return new Response(
      JSON.stringify({
        success: true,
        ...results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Re-enrichment function error:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
