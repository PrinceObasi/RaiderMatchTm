import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Top companies using Greenhouse (add more as needed)
const GREENHOUSE_COMPANIES = [
  'stripe', 'spotify', 'airbnb', 'pinterest', 'squarespace', 'coinbase',
  'reddit', 'robinhood', 'doordash', 'instacart', 'cloudflare', 'databricks',
  'discord', 'dropbox', 'figma', 'grammarly', 'hubspot', 'medium', 'notion',
  'okta', 'palantir', 'peloton', 'qualtrics', 'slack', 'snowflake', 'square',
  'tableau', 'twilio', 'uber', 'unity', 'warbyparker', 'wayfair', 'zendesk',
  'zoom', 'duolingo', 'etsy', 'godaddy', 'hulu', 'indeed', 'lyft', 'mastercard',
  'mongodb', 'nerdwallet', 'opendoor', 'oscar', 'pagerduty', 'pandora',
  'paypal', 'postmates', 'quora', 'roblox', 'roku', 'salesforce', 'snapchat',
  'spacex', 'spotify', 'strava', 'stripe', 'thoughtworks', 'thumbtack',
  'tripadvisor', 'twitch', 'venmo', 'vimeo', 'virtu', 'wealthfront',
  'wellsfargo', 'wework', 'wish', 'workday', 'yelp', 'zillow', 'zscaler'
]

// Top companies using Lever
const LEVER_COMPANIES = [
  'netflix', 'shopify', 'yelp', 'twitch', 'figma', 'coursera', 'gitlab',
  'plaid', 'amplitude', 'khanacademy', 'blend', 'convoy', 'faire', 'flexport',
  'forward', 'gong', 'guild', 'harness', 'heap', 'honor', 'imply', 'iron',
  'jellyfish', 'karat', 'lattice', 'lever', 'lime', 'lucid', 'lyric', 'magic',
  'mainstreet', 'melio', 'mux', 'newfront', 'nextdoor', 'nuro', 'opengov',
  'pave', 'persona', 'pilot', 'pipe', 'plume', 'poshmark', 'primer', 'procore',
  'qualia', 'radius', 'rappi', 'reforge', 'remix', 'render', 'retool', 'ripple',
  'scale', 'segment', 'sift', 'sigma', 'sonder', 'sourcegraph', 'standard',
  'stord', 'stripe', 'substack', 'sundae', 'superside', 'sysdig', 'talkdesk'
]

interface Internship {
  company: string
  role_title: string
  location: string
  application_link: string
  department?: string
  posted_date?: string
}

/**
 * Scrapes Greenhouse job board for a company
 */
async function scrapeGreenhouseCompany(companySlug: string): Promise<Internship[]> {
  const internships: Internship[] = []
  
  try {
    const url = `https://boards.greenhouse.io/${companySlug}`
    console.log(`Scraping Greenhouse: ${companySlug}`)
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })
    
    if (!response.ok) {
      console.log(`Failed to fetch ${companySlug}: ${response.status}`)
      return []
    }
    
    const html = await response.text()
    
    // Parse job listings
    // Greenhouse structure: <div class="opening"><a href="/company/jobs/id">Title</a>
    const jobPattern = /<div[^>]*class="opening"[^>]*>.*?<a[^>]*href="(\/[^"]+\/jobs\/\d+)"[^>]*>([^<]+)<\/a>.*?<span[^>]*class="location"[^>]*>([^<]+)<\/span>/gs
    
    let match
    while ((match = jobPattern.exec(html)) !== null) {
      const jobPath = match[1]
      const title = match[2].trim()
      const location = match[3].trim()
      
      // Filter for internships
      if (title.toLowerCase().includes('intern') || 
          title.toLowerCase().includes('co-op') ||
          title.toLowerCase().includes('summer 202')) {
        
        const fullUrl = jobPath.startsWith('http') 
          ? jobPath 
          : `https://boards.greenhouse.io${jobPath}`
        
        internships.push({
          company: companySlug.charAt(0).toUpperCase() + companySlug.slice(1),
          role_title: title,
          location: location,
          application_link: fullUrl
        })
      }
    }
    
    // Alternative pattern if the first doesn't work
    if (internships.length === 0) {
      const altPattern = /<a[^>]*href="(https:\/\/boards\.greenhouse\.io\/[^"]+\/jobs\/\d+)"[^>]*>([^<]+)<\/a>/g
      
      while ((match = altPattern.exec(html)) !== null) {
        const title = match[2].trim()
        if (title.toLowerCase().includes('intern')) {
          internships.push({
            company: companySlug.charAt(0).toUpperCase() + companySlug.slice(1),
            role_title: title,
            location: 'See posting',
            application_link: match[1]
          })
        }
      }
    }
    
    console.log(`Found ${internships.length} internships at ${companySlug}`)
    
  } catch (error) {
    console.error(`Error scraping ${companySlug}:`, error)
  }
  
  return internships
}

/**
 * Scrapes Lever job board for a company
 */
async function scrapeLeverCompany(companySlug: string): Promise<Internship[]> {
  const internships: Internship[] = []
  
  try {
    // Try different URL patterns
    const urls = [
      `https://jobs.lever.co/${companySlug}?commitment=Internship`,
      `https://jobs.lever.co/${companySlug}`
    ]
    
    for (const url of urls) {
      console.log(`Scraping Lever: ${companySlug}`)
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      })
      
      if (!response.ok) continue
      
      const html = await response.text()
      
      // Parse Lever job listings
      // Structure: <div class="posting"><a class="posting-title" href="URL">Title</a>
      const jobPattern = /<a[^>]*class="posting-title"[^>]*href="(https:\/\/jobs\.lever\.co\/[^"]+)"[^>]*>.*?<h5[^>]*>([^<]+)<\/h5>.*?<span[^>]*class="location"[^>]*>([^<]+)<\/span>/gs
      
      let match
      while ((match = jobPattern.exec(html)) !== null) {
        const url = match[1]
        const title = match[2].trim()
        const location = match[3].trim()
        
        // Filter for internships
        if (title.toLowerCase().includes('intern') || 
            title.toLowerCase().includes('co-op')) {
          internships.push({
            company: companySlug.charAt(0).toUpperCase() + companySlug.slice(1),
            role_title: title,
            location: location,
            application_link: url
          })
        }
      }
      
      // Alternative simpler pattern
      if (internships.length === 0) {
        const altPattern = /<a[^>]*href="(https:\/\/jobs\.lever\.co\/[^"]+)"[^>]*>([^<]*[Ii]ntern[^<]*)<\/a>/g
        
        while ((match = altPattern.exec(html)) !== null) {
          internships.push({
            company: companySlug.charAt(0).toUpperCase() + companySlug.slice(1),
            role_title: match[2].trim(),
            location: 'See posting',
            application_link: match[1]
          })
        }
      }
      
      if (internships.length > 0) break
    }
    
    console.log(`Found ${internships.length} internships at ${companySlug}`)
    
  } catch (error) {
    console.error(`Error scraping Lever ${companySlug}:`, error)
  }
  
  return internships
}

/**
 * Main scraping function
 */
async function scrapeAllInternships(options: { source?: string, limit?: number }) {
  const allInternships: Internship[] = []
  const { source = 'both', limit = 10 } = options
  
  // Scrape Greenhouse companies
  if (source === 'both' || source === 'greenhouse') {
    console.log('Starting Greenhouse scraping...')
    const companiesToScrape = GREENHOUSE_COMPANIES.slice(0, limit)
    
    for (const company of companiesToScrape) {
      const internships = await scrapeGreenhouseCompany(company)
      allInternships.push(...internships)
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
  
  // Scrape Lever companies
  if (source === 'both' || source === 'lever') {
    console.log('Starting Lever scraping...')
    const companiesToScrape = LEVER_COMPANIES.slice(0, limit)
    
    for (const company of companiesToScrape) {
      const internships = await scrapeLeverCompany(company)
      allInternships.push(...internships)
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
  
  return allInternships
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

    // Get parameters from request
    const { source = 'both', limit = 5 } = await req.json().catch(() => ({}))
    
    console.log(`Scraping ${source} with limit ${limit}`)
    
    // Scrape internships
    const internships = await scrapeAllInternships({ source, limit })
    
    console.log(`Total internships found: ${internships.length}`)
    
    // Insert into database
    let inserted = 0
    let skipped = 0
    const errors: string[] = []
    const samples: any[] = []
    
    for (const internship of internships) {
      try {
        // Check for duplicates
        const { data: existing } = await supabase
          .from('internships')
          .select('id')
          .eq('company', internship.company)
          .eq('role_title', internship.role_title)
          .maybeSingle()
        
        if (existing) {
          skipped++
          continue
        }
        
        // Determine if Texas-based
        const texasKeywords = ['TX', 'Texas', 'Austin', 'Houston', 'Dallas', 
                              'San Antonio', 'Fort Worth', 'Plano', 'Irving']
        const isTexas = texasKeywords.some(keyword => 
          internship.location.includes(keyword)
        )
        
        // Determine if remote
        const isRemote = internship.location.toLowerCase().includes('remote')
        
        // Insert new internship with DIRECT LINK from the start
        const { error: insertError } = await supabase
          .from('internships')
          .insert({
            company: internship.company,
            role_title: internship.role_title,
            location: internship.location,
            application_link: internship.application_link, // This is already direct!
            direct_link: internship.application_link, // Same as above - it's direct!
            link_type: 'direct', // No extraction needed!
            is_texas: isTexas,
            remote_flag: isRemote,
            employment_type: 'internship',
            source_url: internship.application_link.includes('greenhouse') 
              ? 'https://greenhouse.io' 
              : 'https://lever.co',
            scrape_source: internship.application_link.includes('greenhouse') 
              ? 'greenhouse' 
              : 'lever',
            date_posted: new Date().toISOString().split('T')[0],
            link_valid: true,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        
        if (!insertError) {
          inserted++
          if (samples.length < 5) {
            samples.push({
              company: internship.company,
              role: internship.role_title,
              location: internship.location,
              link: internship.application_link
            })
          }
        } else {
          errors.push(`${internship.company}: ${insertError.message}`)
        }
        
      } catch (error: any) {
        errors.push(`${internship.company}: ${error.message}`)
      }
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        source: source,
        companies_scraped: limit,
        total_found: internships.length,
        inserted,
        skipped,
        samples,
        errors: errors.slice(0, 5),
        message: `Found ${internships.length} internships from ${limit} companies. All links are DIRECT - no extraction needed!`
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
