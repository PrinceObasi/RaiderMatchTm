import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Checks if a URL is an image or other non-application resource
 */
function isImageOrAssetUrl(url: string): boolean {
  if (!url) return true
  
  const lowerUrl = url.toLowerCase()
  
  // Image extensions
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico']
  if (imageExtensions.some(ext => lowerUrl.includes(ext))) {
    return true
  }
  
  // Known CDN/image hosting patterns
  const imagePatterns = [
    'logo',
    'simplify-imgs',
    'storage.googleapis.com',
    'cloudinary.com',
    's3.amazonaws.com/assets',
    'cdn',
    '/images/',
    '/img/',
    '/assets/',
    '/static/'
  ]
  
  return imagePatterns.some(pattern => lowerUrl.includes(pattern))
}

/**
 * Checks if a URL is likely an actual job application page
 */
function isLikelyApplicationUrl(url: string): boolean {
  if (!url || !url.startsWith('http')) return false
  
  const lowerUrl = url.toLowerCase()
  
  // Must NOT be an image
  if (isImageOrAssetUrl(url)) return false
  
  // Should contain job/career related keywords
  const goodPatterns = [
    'career', 'job', 'apply', 'application', 'position', 'opening',
    'greenhouse.io', 'lever.co', 'workday', 'taleo', 'icims',
    'myworkdayjobs', 'smartrecruiters', 'bamboohr', 'ashbyhq',
    'recruiting', 'applicant', 'opportunity', 'vacancy', 'hire'
  ]
  
  // Check if URL contains any good patterns
  const hasGoodPattern = goodPatterns.some(pattern => lowerUrl.includes(pattern))
  
  // Also accept major company domains even without keywords
  const majorCompanyDomains = [
    'microsoft.com', 'google.com', 'apple.com', 'amazon.jobs',
    'meta.com', 'tesla.com', 'nvidia.com', 'oracle.com',
    'ibm.com', 'intel.com', 'cisco.com', 'adobe.com'
  ]
  
  const isMajorCompany = majorCompanyDomains.some(domain => lowerUrl.includes(domain))
  
  return hasGoodPattern || isMajorCompany
}

/**
 * Extracts the actual application URL from SimplifyJobs page
 */
async function getDirectLink(simplifyUrl: string): Promise<{url: string | null, type: string}> {
  try {
    console.log(`Processing: ${simplifyUrl}`)
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout
    
    // Fetch the SimplifyJobs page
    const response = await fetch(simplifyUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    })
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      console.log(`HTTP ${response.status} for ${simplifyUrl}`)
      return { url: null, type: 'http_error' }
    }
    
    const html = await response.text()
    console.log(`Fetched ${html.length} bytes from ${simplifyUrl}`)
    
    // Strategy 1: Look for "Apply" button/link that goes to external site
    const applyButtonPatterns = [
      /<a[^>]*class="[^"]*apply[^"]*"[^>]*href="([^"]+)"/gi,
      /<a[^>]*href="([^"]+)"[^>]*class="[^"]*apply[^"]*"/gi,
      /<a[^>]*href="([^"]+)"[^>]*>.*?Apply.*?<\/a>/gi,
      /href="(https?:\/\/(?!simplify\.jobs)[^"]+)"[^>]*>.*?Apply/gi
    ]
    
    for (const pattern of applyButtonPatterns) {
      const matches = [...html.matchAll(pattern)]
      for (const match of matches) {
        const url = match[1]
        if (isLikelyApplicationUrl(url)) {
          console.log(`Found apply button URL: ${url}`)
          return { url, type: 'direct' }
        }
      }
    }
    
    // Strategy 2: Look for iframes (some sites embed application forms)
    const iframeMatch = html.match(/<iframe[^>]*src="([^"]+)"[^>]*>/i)
    if (iframeMatch && isLikelyApplicationUrl(iframeMatch[1])) {
      console.log(`Found iframe URL: ${iframeMatch[1]}`)
      return { url: iframeMatch[1], type: 'iframe' }
    }
    
    // Strategy 3: Look for meta refresh or JavaScript redirects
    const metaRefresh = html.match(/<meta[^>]*?http-equiv=["']refresh["'][^>]*?content=["']\d+;\s*url=([^"']+)/i)
    if (metaRefresh && isLikelyApplicationUrl(metaRefresh[1])) {
      console.log(`Found meta refresh URL: ${metaRefresh[1]}`)
      return { url: metaRefresh[1], type: 'meta_refresh' }
    }
    
    // Strategy 4: Look for window.location redirects
    const jsRedirectPatterns = [
      /window\.location\.href\s*=\s*["']([^"']+)["']/,
      /window\.location\s*=\s*["']([^"']+)["']/,
      /window\.location\.replace\(["']([^"']+)["']\)/
    ]
    
    for (const pattern of jsRedirectPatterns) {
      const match = html.match(pattern)
      if (match && isLikelyApplicationUrl(match[1])) {
        console.log(`Found JS redirect URL: ${match[1]}`)
        return { url: match[1], type: 'js_redirect' }
      }
    }
    
    // Strategy 5: Find ANY external link that looks like a job application
    // But skip images, css, js, etc.
    const allLinks = html.matchAll(/href=["']?(https?:\/\/[^"'\s>]+)/gi)
    const externalLinks: string[] = []
    
    for (const match of allLinks) {
      const url = match[1]
      if (!url.includes('simplify.jobs') && isLikelyApplicationUrl(url)) {
        externalLinks.push(url)
      }
    }
    
    if (externalLinks.length > 0) {
      // Prefer greenhouse, lever, workday links
      const preferredLink = externalLinks.find(url => 
        url.includes('greenhouse.io') || 
        url.includes('lever.co') || 
        url.includes('workday') ||
        url.includes('taleo')
      )
      
      const finalUrl = preferredLink || externalLinks[0]
      console.log(`Found external link: ${finalUrl}`)
      return { url: finalUrl, type: 'extracted' }
    }
    
    console.log(`No application URL found for ${simplifyUrl}`)
    return { url: null, type: 'not_found' }
    
  } catch (error: any) {
    console.error(`Error processing ${simplifyUrl}:`, error.message)
    return { url: null, type: 'error' }
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

    const { batch_size = 10 } = await req.json().catch(() => ({}))

    // Get SimplifyJobs internships without proper direct links
    const { data: internships, error: fetchError } = await supabase
      .from('internships')
      .select('id, company, role_title, application_link, extraction_attempts')
      .eq('scrape_source', 'simplify_jobs')
      .or('direct_link.is.null,direct_link.like.%logo%,direct_link.like.%.png%')
      .lt('extraction_attempts', 3)
      .limit(batch_size)

    if (fetchError) throw fetchError

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

    console.log(`Processing ${internships.length} SimplifyJobs URLs`)

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
      samples: [] as any[]
    }

    for (const internship of internships) {
      try {
        // Increment attempt counter
        await supabase
          .from('internships')
          .update({ 
            extraction_attempts: (internship.extraction_attempts || 0) + 1 
          })
          .eq('id', internship.id)
        
        // Extract the direct link
        const { url: directLink, type } = await getDirectLink(internship.application_link)
        
        if (directLink && !isImageOrAssetUrl(directLink)) {
          // Success! Update with the real application URL
          const { error: updateError } = await supabase
            .from('internships')
            .update({
              direct_link: directLink,
              link_type: type,
              link_extracted_at: new Date().toISOString()
            })
            .eq('id', internship.id)
          
          if (!updateError) {
            results.success++
            if (results.samples.length < 3) {
              results.samples.push({
                company: internship.company,
                role: internship.role_title,
                simplify: internship.application_link,
                direct: directLink,
                type
              })
            }
            console.log(`✓ ${internship.company}: ${directLink}`)
          }
        } else {
          // Failed to find application URL
          await supabase
            .from('internships')
            .update({
              link_type: 'extraction_failed',
              link_extracted_at: new Date().toISOString()
            })
            .eq('id', internship.id)
          
          results.failed++
          console.log(`✗ ${internship.company}: No valid application URL found`)
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000)) // 2 second delay
        
      } catch (error: any) {
        console.error(`Error processing ${internship.company}:`, error.message)
        results.errors.push(`${internship.company}: ${error.message}`)
        results.failed++
      }
    }

    // Get remaining count
    const { count: remaining } = await supabase
      .from('internships')
      .select('*', { count: 'exact', head: true })
      .eq('scrape_source', 'simplify_jobs')
      .or('direct_link.is.null,direct_link.like.%logo%')
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