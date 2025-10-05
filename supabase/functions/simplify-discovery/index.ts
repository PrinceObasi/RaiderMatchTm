import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getDatabaseStats } from '../company-mappings/database.ts'

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

// Step 2 is now handled by resolve-direct-links edge function

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

// Step 3: Fallback is now handled by resolve-direct-links edge function

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
    
    // Process jobs (no concurrency needed, just map the data)
    for (const job of simplifyJobs) {
      try {
        processedJobs.push({
          company: job.company,
          role_title: job.role,
          location: job.location,
          simplify_url: job.simplifyLink,
          application_link: job.simplifyLink,
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
        })
      } catch (error: any) {
        if (errors.length < 20) {
          errors.push(`${job.company}: ${error.message}`)
        }
      }
    }
    
    console.log(`\n✅ Processed ${processedJobs.length} jobs with Simplify URLs`)
    
    // Insert to database (using upsert on simplify_url)
    let duplicates = 0
    if (processedJobs.length > 0) {
      try {
        const { error } = await supabase
          .from('internships')
          .upsert(processedJobs, { 
            onConflict: 'simplify_url',
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
      texasJobs: processedJobs.filter(j => j.is_texas).length,
      companies: [...new Set(processedJobs.map(j => j.company))],
      databaseStats: dbStats,
      errors: errors.slice(0, 20),
      sampleJobs: processedJobs.slice(0, 10).map(j => ({
        company: j.company,
        role_title: j.role_title,
        simplify_url: j.simplify_url
      })),
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
