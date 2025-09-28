import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Follows redirect chain to get the final destination URL
 */
async function getDirectLink(simplifyUrl: string): Promise<{url: string | null, type: string}> {
  try {
    console.log(`Extracting direct link from: ${simplifyUrl}`)
    
    // Step 1: Try following HTTP redirects
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
    
    try {
      // First, get the SimplifyJobs page
      const response = await fetch(simplifyUrl, {
        method: 'GET',
        signal: controller.signal,
        redirect: 'manual', // Don't auto-follow
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      })
      clearTimeout(timeoutId)
      
      // Check for HTTP redirect
      const location = response.headers.get('location')
      if (location && !location.includes('simplify.jobs')) {
        console.log(`Found HTTP redirect to: ${location}`)
        return { url: location, type: 'direct' }
      }
      
      // If no immediate redirect, parse the HTML
      const html = await response.text()
      
      // Look for meta refresh redirect
      const metaRefresh = html.match(/<meta[^>]*?http-equiv=["']refresh["'][^>]*?content=["']\d+;\s*url=([^"']+)/i)
      if (metaRefresh && metaRefresh[1]) {
        const url = metaRefresh[1].replace(/&amp;/g, '&')
        if (!url.includes('simplify.jobs')) {
          console.log(`Found meta refresh to: ${url}`)
          return { url, type: 'direct' }
        }
      }
      
      // Look for JavaScript redirects
      const jsPatterns = [
        /window\.location\.href\s*=\s*["']([^"']+)["']/,
        /window\.location\s*=\s*["']([^"']+)["']/,
        /window\.location\.replace\(["']([^"']+)["']\)/,
        /window\.open\(["']([^"']+)["']/,
        /data-url=["']([^"']+)["']/,
        /href=["'](https?:\/\/(?!simplify\.jobs)[^"']+)["']/
      ]
      
      for (const pattern of jsPatterns) {
        const match = html.match(pattern)
        if (match && match[1] && !match[1].includes('simplify.jobs')) {
          console.log(`Found JS redirect to: ${match[1]}`)
          return { url: match[1], type: 'direct' }
        }
      }
      
      // Look for any external link in the page that might be the application
      const externalLinks = html.match(/https?:\/\/(?!simplify\.jobs)[a-zA-Z0-9\-._~:\/?#\[\]@!$&'()*+,;=]+/g)
      if (externalLinks && externalLinks.length > 0) {
        // Filter and score potential application URLs
        const scoredLinks = externalLinks
          .filter(link => isValidApplicationUrl(link))
          .map(link => {
            let score = 0
            const lowerLink = link.toLowerCase()
            
            // Higher scores for job-related keywords
            if (lowerLink.includes('career')) score += 10
            if (lowerLink.includes('job')) score += 8
            if (lowerLink.includes('apply')) score += 15
            if (lowerLink.includes('application')) score += 12
            if (lowerLink.includes('position')) score += 6
            if (lowerLink.includes('opportunity')) score += 5
            
            // Popular ATS systems get high scores
            if (lowerLink.includes('greenhouse')) score += 20
            if (lowerLink.includes('lever')) score += 20
            if (lowerLink.includes('workday')) score += 20
            if (lowerLink.includes('taleo')) score += 15
            if (lowerLink.includes('myworkday')) score += 18
            if (lowerLink.includes('recruiting')) score += 10
            
            return { url: link, score }
          })
          .sort((a, b) => b.score - a.score)
        
        if (scoredLinks.length > 0 && scoredLinks[0].score > 0) {
          console.log(`Found scored application link: ${scoredLinks[0].url} (score: ${scoredLinks[0].score})`)
          return { url: scoredLinks[0].url, type: 'extracted' }
        }
      }
      
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error('Request timeout')
      } else {
        console.error('Fetch error:', error)
      }
    }
    
    // If we can't find a direct link, return null
    return { url: null, type: 'failed' }
    
  } catch (error: any) {
    console.error(`Error extracting direct link from ${simplifyUrl}:`, error)
    return { url: null, type: 'error' }
  }
}

/**
 * Validates if a URL is actually a valid application link
 */
function isValidApplicationUrl(url: string): boolean {
  if (!url) return false
  
  // Exclude image files and storage URLs
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico']
  if (imageExtensions.some(ext => url.toLowerCase().includes(ext))) {
    return false
  }
  
  // Exclude storage and CDN URLs
  const excludedDomains = [
    'facebook.com', 
    'twitter.com', 
    'linkedin.com/company', // Company pages, not job listings
    'instagram.com',
    'youtube.com',
    'simplify.jobs',
    'storage.googleapis.com',
    'cdn.',
    'assets.',
    'static.',
    'img.',
    'images.'
  ]
  
  // Must be a valid HTTP/HTTPS URL
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return false
  }
  
  // Exclude if it contains excluded domains
  if (excludedDomains.some(domain => url.includes(domain))) {
    return false
  }
  
  // Prefer URLs that contain job/career-related keywords
  const jobKeywords = [
    'career', 'job', 'apply', 'application', 'position', 'opportunity',
    'greenhouse', 'lever', 'workday', 'taleo', 'myworkday', 'recruiting',
    'jobs', 'careers', 'hire', 'employment'
  ]
  
  // Give preference to URLs with job-related keywords
  const hasJobKeywords = jobKeywords.some(keyword => url.toLowerCase().includes(keyword))
  
  return hasJobKeywords || url.length > 30 // Basic length check for legitimate URLs
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

    // Get batch size from request or default to 20
    const { batch_size = 20 } = await req.json().catch(() => ({}))

    // Get SimplifyJobs internships that don't have direct links yet
    const { data: internships, error: fetchError } = await supabase
      .from('internships')
      .select('id, company, role_title, application_link, extraction_attempts')
      .eq('scrape_source', 'simplify_jobs')
      .is('direct_link', null)
      .lt('extraction_attempts', 3) // Don't retry too many times
      .limit(batch_size)

    if (fetchError) {
      throw new Error(`Failed to fetch internships: ${fetchError.message}`)
    }

    if (!internships || internships.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No internships to process',
          processed: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Processing ${internships.length} internships`)

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
      samples: [] as any[]
    }

    for (const internship of internships) {
      try {
        console.log(`Processing: ${internship.company} - ${internship.role_title}`)
        
        // Increment attempt counter
        await supabase
          .from('internships')
          .update({ 
            extraction_attempts: (internship.extraction_attempts || 0) + 1 
          })
          .eq('id', internship.id)
        
        // Extract the direct link
        const { url: directLink, type } = await getDirectLink(internship.application_link)
        
        if (directLink && isValidApplicationUrl(directLink)) {
          // Update with the direct link
          const { error: updateError } = await supabase
            .from('internships')
            .update({
              direct_link: directLink,
              link_type: type,
              link_extracted_at: new Date().toISOString(),
              application_link: directLink // Replace the SimplifyJobs URL entirely
            })
            .eq('id', internship.id)
          
          if (!updateError) {
            results.success++
            if (results.samples.length < 5) {
              results.samples.push({
                company: internship.company,
                original: internship.application_link,
                direct: directLink,
                type
              })
            }
            console.log(`✓ Updated ${internship.company} with direct link`)
          } else {
            throw updateError
          }
        } else {
          // Mark as failed extraction
          await supabase
            .from('internships')
            .update({
              link_type: 'redirect_failed',
              link_extracted_at: new Date().toISOString()
            })
            .eq('id', internship.id)
          
          results.failed++
          console.log(`✗ Failed to extract direct link for ${internship.company}`)
        }
        
        // Rate limiting - wait between requests to avoid being blocked
        await new Promise(resolve => setTimeout(resolve, 1000)) // 1 second delay
        
      } catch (error: any) {
        console.error(`Error processing ${internship.company}:`, error)
        results.errors.push(`${internship.company}: ${error.message}`)
        results.failed++
      }
    }

    // Get stats
    const { count: remaining } = await supabase
      .from('internships')
      .select('*', { count: 'exact', head: true })
      .eq('scrape_source', 'simplify_jobs')
      .is('direct_link', null)
      .lt('extraction_attempts', 3)

    return new Response(
      JSON.stringify({
        success: true,
        processed: internships.length,
        extracted: results.success,
        failed: results.failed,
        remaining: remaining || 0,
        samples: results.samples,
        errors: results.errors.slice(0, 5)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})