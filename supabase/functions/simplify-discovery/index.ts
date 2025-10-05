import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { findCompanyMapping, generateDirectUrl, getDatabaseStats } from '../company-mappings/database.ts'

interface SimplifyJob {
  company: string
  role: string
  location: string
  simplifyLink: string
  datePosted?: string
}

// Step 1: Scrape SimplifyJobs to discover what's available
async function discoverJobsFromSimplify(): Promise<SimplifyJob[]> {
  console.log("📡 Fetching SimplifyJobs data...")
  
  const response = await fetch('https://raw.githubusercontent.com/SimplifyJobs/Summer2026-Internships/dev/README.md')
  if (!response.ok) {
    throw new Error('Failed to fetch SimplifyJobs data')
  }
  
  const markdown = await response.text()
  const jobs: SimplifyJob[] = []
  
  // Parse the markdown table
  const lines = markdown.split('\n')
  let inTable = false
  
  for (const line of lines) {
    if (line.includes('| Company |') || line.includes('| --- |')) {
      inTable = true
      continue
    }
    
    if (inTable && line.startsWith('|')) {
      const columns = line.split('|').map(col => col.trim())
      if (columns.length >= 4) {
        // Extract company name (remove emoji and markdown)
        let company = columns[1].replace(/[^\w\s&.-]/g, '').trim()
        company = company.replace(/\*\*/g, '').replace(/`/g, '').trim()
        
        // Extract role
        const role = columns[2].replace(/[^\w\s&.,-]/g, '').trim()
        
        // Extract location
        const location = columns[3]
        
        // Extract SimplifyJobs link
        const linkMatch = columns[4]?.match(/https:\/\/simplify\.jobs\/[^\)"\s]+/)
        const simplifyLink = linkMatch ? linkMatch[0] : ''
        
        if (company && role && simplifyLink) {
          jobs.push({
            company: company.trim(),
            role: role.trim(),
            location: location?.trim() || 'Not specified',
            simplifyLink
          })
        }
      }
    }
  }
  
  console.log(`✅ Found ${jobs.length} jobs on SimplifyJobs`)
  return jobs
}

// Step 2: Try to find direct link using company database
async function findDirectLink(job: SimplifyJob): Promise<string | null> {
  const mapping = findCompanyMapping(job.company)
  
  if (!mapping) {
    console.log(`❌ No mapping for ${job.company}`)
    return null
  }
  
  try {
    // Handle Greenhouse
    if (mapping.ats_type === 'greenhouse') {
      const url = `https://boards.greenhouse.io/${mapping.ats_identifier}`
      const response = await fetch(url)
      if (!response.ok) return null
      
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
      
      return bestMatch
    }
    
    // Handle Lever
    if (mapping.ats_type === 'lever') {
      const url = `https://jobs.lever.co/${mapping.ats_identifier}`
      const response = await fetch(url)
      if (!response.ok) return null
      
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
      
      return bestMatch
    }
    
    // For other ATS types, use the helper function
    return generateDirectUrl(mapping, job.role)
    
  } catch (error: any) {
    console.log(`⚠️ Error finding link for ${job.company}: ${error.message}`)
  }
  
  return null
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
    const simplifyJobs = await discoverJobsFromSimplify()
    
    console.log(`\n🔍 Processing ${simplifyJobs.length} jobs...`)
    
    const processedJobs = []
    let successCount = 0
    let fallbackCount = 0
    
    // Process in batches to avoid overwhelming servers
    const batchSize = 10
    for (let i = 0; i < Math.min(simplifyJobs.length, 200); i += batchSize) {
      const batch = simplifyJobs.slice(i, i + batchSize)
      
      const batchPromises = batch.map(async (job) => {
        // Try to find direct link
        let directLink = await findDirectLink(job)
        let linkType = 'direct'
        
        // If no direct link found, use fallback
        if (!directLink) {
          directLink = await googleSearchCareerPage(job.company, job.role)
          linkType = 'search'
          fallbackCount++
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
          visa_sponsorship: null,
          is_texas: isTexasLocation(job.location),
          remote_flag: job.location.toLowerCase().includes('remote'),
          scrape_source: 'simplify_discovery',
          jd_summary: null,
          date_posted: new Date().toISOString().split('T')[0],
          salary_min: null,
          salary_max: null,
          is_active: true
        }
      })
      
      const batchResults = await Promise.allSettled(batchPromises)
      batchResults.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          processedJobs.push(result.value)
        }
      })
      
      console.log(`Processed batch ${i/batchSize + 1}: ${processedJobs.length} total jobs`)
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Stop if we have enough for launch
      if (processedJobs.length >= 150) break
    }
    
    console.log(`\n✅ Successfully resolved ${successCount} direct links`)
    console.log(`⚠️ Used fallback search for ${fallbackCount} jobs`)
    
    // Insert to database
    if (processedJobs.length > 0) {
      // Clear old data
      await supabase.from('internships').delete().eq('scrape_source', 'simplify_discovery')
      
      // Insert new jobs
      const { error } = await supabase
        .from('internships')
        .insert(processedJobs)
      
      if (error) {
        console.error('Database error:', error)
      }
    }
    
    // Summary
    const summary = {
      success: true,
      totalProcessed: simplifyJobs.length,
      totalInserted: processedJobs.length,
      directLinksFound: successCount,
      fallbacksUsed: fallbackCount,
      texasJobs: processedJobs.filter(j => j.is_texas).length,
      companies: [...new Set(processedJobs.map(j => j.company))],
      databaseStats: dbStats,
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
      { headers: { 'Content-Type': 'application/json' } }
    )
    
  } catch (error: any) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
