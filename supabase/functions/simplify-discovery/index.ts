import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { findCompanyMapping, generateDirectUrl, getDatabaseStats, detectATSFromUrl } from '../company-mappings/database.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SimplifyJob {
  company: string
  role: string
  location: string
  simplifyLink: string
  datePosted?: string
}

// Step 1: Scrape SimplifyJobs to discover what's available
async function discoverJobsFromSimplify(): Promise<SimplifyJob[]> {
  console.log("📡 Fetching SimplifyJobs 2026 data...")
  
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 9000)
  
  try {
    const response = await fetch('https://raw.githubusercontent.com/SimplifyJobs/Summer2026-Internships/dev/README.md', {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; InternshipBot/1.0)' }
    })
    clearTimeout(timeout)
    
    if (!response.ok) {
      throw new Error(`GitHub fetch failed: ${response.status}`)
    }
  
    const markdown = await response.text()
    const jobs: SimplifyJob[] = []
  
  // Parse HTML tables (new format in 2026 README)
  // We scan all <tr> rows and extract: Company, Role, Location, Simplify link
  const rows = [...markdown.matchAll(/<tr>([\s\S]*?)<\/tr>/gim)]

  for (const m of rows) {
    const rowHtml = m[1]

    // Extract all <td> contents for the row
    const tds = [...rowHtml.matchAll(/<td[\s\S]*?>([\s\S]*?)<\/td>/gim)].map(x => (x[1] || ''))
    if (tds.length < 4) continue

    // Company: prefer anchor text in first cell
    let companyRaw = tds[0]
    const companyAnchor = companyRaw.match(/<a[^>]*>([\s\S]*?)<\/a>/i)
    const company = (companyAnchor ? companyAnchor[1] : companyRaw)
      .replace(/<[^>]+>/g, '')
      .replace(/[^\w\s&.-]/g, '')
      .trim()

    if (!company || company === '↳') continue // skip continuation rows

    // Role from second cell
    const role = tds[1]
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    // Location from third cell (strip tags, handle <details>)
    const location = tds[2]
      .replace(/<br\s*\/?>(?=\S)/gi, ', ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() || 'Not specified'

    // Simplify link from fourth cell
    const simplifyMatch = tds[3].match(/https:\/\/simplify\.jobs\/p\/[^"'\s<>]+/i)
    const simplifyLink = simplifyMatch ? simplifyMatch[0] : ''

    if (company && role && simplifyLink) {
      jobs.push({ company, role, location, simplifyLink })
    }
  }
    
    console.log(`✅ Found ${jobs.length} jobs on SimplifyJobs 2026`)
    if (jobs.length > 0) {
      console.log(`📋 Sample companies: ${jobs.slice(0, 3).map(j => j.company).join(', ')}`)
    }
    return jobs
  } catch (error: any) {
    clearTimeout(timeout)
    throw new Error(`GitHub fetch error: ${error.message}`)
  }
}

// Step 2: Try to find direct link using company database or URL detection
async function findDirectLink(job: SimplifyJob): Promise<{ url: string | null; method: string; error?: string }> {
  // First, try company database mapping
  const mapping = findCompanyMapping(job.company)
  
  if (mapping) {
    try {
      // Handle Greenhouse
      if (mapping.ats_type === 'greenhouse') {
        const url = `https://boards.greenhouse.io/${mapping.ats_identifier}`
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 9000)
        
        const response = await fetch(url, {
          method: 'GET',
          redirect: 'follow',
          signal: controller.signal,
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; InternshipBot/1.0)' }
        })
        clearTimeout(timeout)
        
        if (!response.ok) return { url: null, method: 'mapping_failed', error: `HTTP ${response.status}` }
        
        const html = await response.text()
        
        // Search for the role title in the HTML
        const roleKeywords = job.role.toLowerCase()
          .replace('software engineering', 'software engineer')
          .replace('swe ', 'software engineer ')
          .split(' ')
          .filter(word => word.length > 3)
        
        // Find all job links
        const jobLinkPattern = /<a[^>]*href="(\/[^"]+)"[^>]*>(.*?)<\/a>/gi
        let bestMatch = null
        let bestScore = 0
        
        let match
        while ((match = jobLinkPattern.exec(html)) !== null) {
          const link = match[1]
          const title = match[2].toLowerCase()
          
          // Score based on keyword matches
          let score = 0
          roleKeywords.forEach(keyword => {
            if (title.includes(keyword)) score++
          })
          
          if (score > bestScore && title.includes('intern')) {
            bestScore = score
            bestMatch = `https://boards.greenhouse.io${link}`
          }
        }
        
        return { url: bestMatch, method: 'mapping_greenhouse' }
      }
      
      // Handle Lever
      if (mapping.ats_type === 'lever') {
        const url = `https://jobs.lever.co/${mapping.ats_identifier}`
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 9000)
        
        const response = await fetch(url, {
          method: 'GET',
          redirect: 'follow',
          signal: controller.signal,
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; InternshipBot/1.0)' }
        })
        clearTimeout(timeout)
        
        if (!response.ok) return { url: null, method: 'mapping_failed', error: `HTTP ${response.status}` }
        
        const html = await response.text()
        
        // Similar matching logic for Lever
        const roleKeywords = job.role.toLowerCase().split(' ').filter(word => word.length > 3)
        const linkPattern = /<a[^>]*href="(https:\/\/jobs\.lever\.co\/[^"]+)"[^>]*>(.*?)<\/a>/gi
        
        let bestMatch = null
        let bestScore = 0
        
        let match
        while ((match = linkPattern.exec(html)) !== null) {
          const link = match[1]
          const title = match[2].toLowerCase()
          
          let score = 0
          roleKeywords.forEach(keyword => {
            if (title.includes(keyword)) score++
          })
          
          if (score > bestScore && title.includes('intern')) {
            bestScore = score
            bestMatch = link
          }
        }
        
        return { url: bestMatch, method: 'mapping_lever' }
      }
      
      // For other ATS types, use the helper function
      const directUrl = generateDirectUrl(mapping, job.role)
      return { url: directUrl || null, method: 'mapping_generic' }
      
    } catch (error: any) {
      return { url: null, method: 'mapping_error', error: error.message }
    }
  }
  
  // If no mapping, try to detect ATS from Simplify redirect
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 9000)
    
    const response = await fetch(job.simplifyLink, { 
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; InternshipBot/1.0)' }
    })
    clearTimeout(timeout)
    
    const redirectUrl = response.url !== job.simplifyLink ? response.url : null
    if (redirectUrl) {
      const atsInfo = detectATSFromUrl(redirectUrl)
      if (atsInfo) {
        console.log(`🔍 Detected ${atsInfo.ats_type} for ${job.company} from URL`)
        
        // Build URL based on detected ATS
        if (atsInfo.ats_type === 'greenhouse' && atsInfo.identifier) {
          return { url: `https://boards.greenhouse.io/${atsInfo.identifier}`, method: 'url_detection' }
        } else if (atsInfo.ats_type === 'lever' && atsInfo.identifier) {
          return { url: `https://jobs.lever.co/${atsInfo.identifier}`, method: 'url_detection' }
        } else if (atsInfo.ats_type === 'ashby' && atsInfo.identifier) {
          return { url: `https://jobs.ashbyhq.com/${atsInfo.identifier}`, method: 'url_detection' }
        } else if (atsInfo.ats_type === 'workday' && atsInfo.identifier) {
          return { url: redirectUrl, method: 'url_detection' }
        } else {
          // Use the redirect URL directly
          return { url: redirectUrl, method: 'url_detection' }
        }
      }
    }
  } catch (error: any) {
    return { url: null, method: 'url_error', error: error.message }
  }
  
  return { url: null, method: 'no_mapping' }
}

// Concurrency limiter
async function runWithConcurrencyLimit<T>(
  items: T[],
  fn: (item: T) => Promise<any>,
  limit: number
): Promise<any[]> {
  const results: any[] = []
  const executing: Promise<any>[] = []
  
  for (const item of items) {
    const promise = fn(item).then(result => {
      executing.splice(executing.indexOf(promise), 1)
      return result
    })
    
    results.push(promise)
    executing.push(promise)
    
    if (executing.length >= limit) {
      await Promise.race(executing)
    }
  }
  
  return Promise.allSettled(results)
}

// Step 3: Quick fallback - Google search for career page
async function googleSearchCareerPage(company: string, role: string): Promise<string | null> {
  try {
    const query = encodeURIComponent(`${company} careers ${role} intern apply`)
    return `https://www.google.com/search?q=${query}&btnI=1`
  } catch (error) {
    return null
  }
}

// Helper functions
function isTexasLocation(location: string): boolean {
  const texasKeywords = ['texas', 'tx', 'austin', 'dallas', 'houston', 'san antonio', 'fort worth', 'plano', 'lubbock']
  const locationLower = location.toLowerCase()
  return texasKeywords.some(keyword => locationLower.includes(keyword))
}

function extractTechStack(role: string): string[] {
  const tech = []
  const roleLower = role.toLowerCase()
  
  if (roleLower.includes('frontend')) tech.push('React', 'JavaScript')
  if (roleLower.includes('backend')) tech.push('Python', 'Java')
  if (roleLower.includes('full stack') || roleLower.includes('fullstack')) tech.push('React', 'Node.js')
  if (roleLower.includes('mobile')) tech.push('Swift', 'Kotlin')
  if (roleLower.includes('ml') || roleLower.includes('machine learning')) tech.push('Python', 'TensorFlow')
  if (roleLower.includes('data')) tech.push('Python', 'SQL')
  if (roleLower.includes('cloud')) tech.push('AWS', 'Docker')
  if (roleLower.includes('devops')) tech.push('Kubernetes', 'Docker')
  
  if (tech.length === 0) tech.push('Python', 'JavaScript')
  
  return tech
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  const errors: string[] = []
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Log database stats
    const dbStats = getDatabaseStats()
    console.log(`📊 Company database: ${dbStats.total} companies`)
    console.log(`   Greenhouse: ${dbStats.byATS.greenhouse}, Lever: ${dbStats.byATS.lever}, Ashby: ${dbStats.byATS.ashby}`)
    console.log(`   Workday: ${dbStats.byATS.workday}, Custom: ${dbStats.byATS.custom}`)
    
    // Step 1: Discover jobs from SimplifyJobs
    let simplifyJobs: SimplifyJob[] = []
    try {
      simplifyJobs = await discoverJobsFromSimplify()
    } catch (error: any) {
      const errMsg = `GitHub fetch failed: ${error.message}`
      errors.push(errMsg)
      console.error('❌', errMsg)
      return new Response(
        JSON.stringify({ 
          ok: false, 
          success: false,
          error: errMsg,
          errors: [errMsg]
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    console.log(`\n🔍 Processing ${simplifyJobs.length} jobs...`)
    
    const processedJobs = []
    let successCount = 0
    let fallbackCount = 0
    const fallbackCompanies: Map<string, number> = new Map()
    const methodStats: Map<string, number> = new Map()
    
    // Process with concurrency limit
    const jobsToProcess = simplifyJobs.slice(0, 200)
    const results = await runWithConcurrencyLimit(jobsToProcess, async (job) => {
      try {
        // Try to find direct link
        const result = await findDirectLink(job)
        let directLink = result.url
        let linkType = 'direct'
        
        // Track method
        methodStats.set(result.method, (methodStats.get(result.method) || 0) + 1)
        
        // If error occurred, log it
        if (result.error && errors.length < 20) {
          errors.push(`${job.company}: ${result.error}`)
        }
        
        // If no direct link found, use fallback
        if (!directLink) {
          directLink = await googleSearchCareerPage(job.company, job.role)
          linkType = 'search'
          fallbackCount++
          fallbackCompanies.set(job.company, (fallbackCompanies.get(job.company) || 0) + 1)
        } else {
          successCount++
        }
        
        // If still no link, skip this job
        if (!directLink) {
          return null
        }
        
        return {
          company: job.company,
          role_title: job.role,
          location: job.location,
          application_link: directLink,
          direct_link: directLink,
          link_type: linkType,
          tech_stack: extractTechStack(job.role),
          visa_sponsorship: 'Unspecified',
          is_texas: true, // All nationwide internships are available to Texas students
          remote_flag: job.location.toLowerCase().includes('remote'),
          scrape_source: 'simplify_jobs',
          jd_summary: null,
          date_posted: new Date().toISOString().split('T')[0],
          salary_min: null,
          salary_max: null,
          is_active: true
        }
      } catch (error: any) {
        if (errors.length < 20) {
          errors.push(`${job.company}: ${error.message}`)
        }
        return null
      }
    }, 10) // Concurrency limit of 10
    
    // Collect successful results
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        processedJobs.push(result.value)
      }
    }
    
    console.log(`\n✅ Successfully resolved ${successCount} direct links`)
    console.log(`⚠️ Used fallback search for ${fallbackCount} jobs`)
    
    // Log method breakdown
    console.log(`\n📊 Resolution methods:`)
    for (const [method, count] of methodStats.entries()) {
      console.log(`   ${method}: ${count}`)
    }
    
    // Log top 10 fallback companies
    if (fallbackCompanies.size > 0) {
      const topFallbacks = Array.from(fallbackCompanies.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
      console.log(`\n🔝 Top 10 companies using fallback:`)
      topFallbacks.forEach(([company, count]) => {
        console.log(`   ${company}: ${count} jobs`)
      })
    }
    
    // Insert to database (using upsert for safety)
    let duplicates = 0
    if (processedJobs.length > 0) {
      try {
        const { error } = await supabase
          .from('internships')
          .upsert(processedJobs, { 
            ignoreDuplicates: false
          })
        
        if (error) {
          const errMsg = `Database insert error: ${error.message}`
          errors.push(errMsg)
          console.error('❌', errMsg)
        } else {
          console.log(`✅ Inserted ${processedJobs.length} jobs`)
        }
      } catch (error: any) {
        const errMsg = `Database exception: ${error.message}`
        errors.push(errMsg)
        console.error('❌', errMsg)
      }
    }
    
    // Summary
    const summary = {
      ok: true,
      success: true,
      totalProcessed: simplifyJobs.length,
      totalInserted: processedJobs.length,
      directLinksFound: successCount,
      fallbacksUsed: fallbackCount,
      texasJobs: processedJobs.filter(j => j.is_texas).length,
      companies: [...new Set(processedJobs.map(j => j.company))],
      databaseStats: dbStats,
      errors: errors.slice(0, 20),
      topCompanies: Object.entries(
        processedJobs.reduce((acc: any, job) => {
          acc[job.company] = (acc[job.company] || 0) + 1
          return acc
        }, {})
      )
        .sort((a: any, b: any) => (b[1] as number) - (a[1] as number))
        .slice(0, 10)
        .map(([company, count]) => ({ company, count }))
    }
    
    return new Response(
      JSON.stringify(summary),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error: any) {
    console.error('❌ Unexpected error:', error)
    const errMsg = error.message || 'Unknown error'
    return new Response(
      JSON.stringify({ 
        ok: false, 
        success: false,
        error: errMsg,
        errors: [...errors.slice(0, 19), errMsg]
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
