import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function getDirectLink(simplifyUrl: string): Promise<string | null> {
  try {
    console.log(`Processing URL: ${simplifyUrl}`)
    
    // Follow the redirect chain
    const response = await fetch(simplifyUrl, {
      method: 'HEAD',
      redirect: 'manual', // Don't auto-follow, we want to see each redirect
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    })
    
    // SimplifyJobs usually returns a 302 redirect to the actual company URL
    const location = response.headers.get('location')
    if (location) {
      console.log(`Found redirect to: ${location}`)
      
      // If it's still a simplify.jobs URL, follow it again
      if (location.includes('simplify.jobs')) {
        const secondResponse = await fetch(location, {
          method: 'HEAD',
          redirect: 'manual',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        })
        const finalLocation = secondResponse.headers.get('location')
        console.log(`Final redirect to: ${finalLocation}`)
        return finalLocation || location
      }
      return location
    }
    
    // If no redirect, try to fetch the page and look for meta refresh or JS redirect
    console.log('No redirect found, fetching page content')
    const pageResponse = await fetch(simplifyUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    })
    const html = await pageResponse.text()
    
    // Look for meta refresh
    const metaRefresh = html.match(/meta.*?refresh.*?url=([^"']+)"/i)
    if (metaRefresh) {
      console.log(`Found meta refresh to: ${metaRefresh[1]}`)
      return metaRefresh[1]
    }
    
    // Look for JavaScript redirects
    const jsRedirect = html.match(/window\.location.*?=.*?["']([^"']+)["']/i)
    if (jsRedirect) {
      console.log(`Found JS redirect to: ${jsRedirect[1]}`)
      return jsRedirect[1]
    }
    
    console.log('No direct link found')
    return null
  } catch (error) {
    console.error('Error extracting direct link:', error)
    return null
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Starting direct link extraction...')

    // Get all SimplifyJobs links that haven't been processed
    const { data: internships, error } = await supabase
      .from('internships')
      .select('id, application_link')
      .eq('scrape_source', 'simplify_jobs')
      .is('direct_link', null) // Only get ones we haven't processed
      .limit(50)

    if (error) {
      console.error('Error fetching internships:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch internships' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    console.log(`Found ${internships?.length || 0} internships to process`)

    let updated = 0
    let failed = 0
    const results = []

    for (const internship of internships || []) {
      try {
        const directLink = await getDirectLink(internship.application_link)
        
        if (directLink && !directLink.includes('simplify.jobs')) {
          // Update with the real company link
          const { error: updateError } = await supabase
            .from('internships')
            .update({ 
              direct_link: directLink,
              link_resolved_at: new Date().toISOString()
            })
            .eq('id', internship.id)
          
          if (!updateError) {
            updated++
            console.log(`Updated ${internship.id} with direct link: ${directLink}`)
            results.push({
              id: internship.id,
              original: internship.application_link,
              resolved: directLink,
              status: 'success'
            })
          } else {
            failed++
            console.error(`Failed to update ${internship.id}:`, updateError)
            results.push({
              id: internship.id,
              original: internship.application_link,
              status: 'update_failed',
              error: updateError.message
            })
          }
        } else {
          // Mark as processed even if we couldn't resolve it
          await supabase
            .from('internships')
            .update({ 
              link_resolved_at: new Date().toISOString()
            })
            .eq('id', internship.id)
          
          console.log(`Could not resolve direct link for ${internship.id}`)
          results.push({
            id: internship.id,
            original: internship.application_link,
            status: 'no_direct_link_found'
          })
        }
        
        // Rate limit to avoid getting blocked (500ms between requests)
        await new Promise(resolve => setTimeout(resolve, 500))
        
      } catch (error) {
        failed++
        console.error(`Error processing ${internship.id}:`, error)
        results.push({
          id: internship.id,
          original: internship.application_link,
          status: 'error',
          error: error.message
        })
      }
    }

    return new Response(
      JSON.stringify({ 
        updated, 
        failed,
        total_processed: internships?.length || 0,
        results: results.slice(0, 10) // Only return first 10 for brevity
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})