import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Known company -> career site mappings
const COMPANY_CAREER_MAPPINGS: Record<string, any> = {
  // Greenhouse boards
  "Stripe": { type: "greenhouse", slug: "stripe" },
  "Coinbase": { type: "greenhouse", slug: "coinbase" },
  "Databricks": { type: "greenhouse", slug: "databricks" },
  "Uber": { type: "greenhouse", slug: "uber" },
  "Airbnb": { type: "greenhouse", slug: "airbnb" },
  "Figma": { type: "greenhouse", slug: "figma" },
  "Discord": { type: "greenhouse", slug: "discord" },
  "Roblox": { type: "greenhouse", slug: "roblox" },
  "Scale AI": { type: "greenhouse", slug: "scaleai" },
  "Anthropic": { type: "greenhouse", slug: "anthropic" },
  "Chime": { type: "greenhouse", slug: "chime" },
  "Brex": { type: "greenhouse", slug: "brex" },
  "Plaid": { type: "greenhouse", slug: "plaid" },
  "Nuro": { type: "greenhouse", slug: "nuro" },
  "Samsara": { type: "greenhouse", slug: "samsara" },
  "Affirm": { type: "greenhouse", slug: "affirm" },
  "Indeed": { type: "greenhouse", slug: "indeed" },
  "Capital One": { type: "greenhouse", slug: "capitalone" },
  
  // Lever boards
  "Netflix": { type: "lever", slug: "netflix" },
  "Spotify": { type: "lever", slug: "spotify" },
  "Snap": { type: "lever", slug: "snap" },
  "Block": { type: "lever", slug: "block" },
  "Square": { type: "lever", slug: "block" },
  "Twitch": { type: "lever", slug: "twitch" },
  "Reddit": { type: "lever", slug: "reddit" },
  "Palantir": { type: "lever", slug: "palantir" },
  "Yelp": { type: "lever", slug: "yelp" },
  "Instacart": { type: "lever", slug: "instacart" },
  "Gusto": { type: "lever", slug: "gusto" },
  "Convoy": { type: "lever", slug: "convoy" },
  
  // Custom career sites with search
  "Microsoft": { type: "custom", searchUrl: "https://careers.microsoft.com/v2/global/en/search-results.html?keywords=" },
  "Google": { type: "custom", searchUrl: "https://www.google.com/about/careers/applications/jobs/results/?q=" },
  "Meta": { type: "custom", searchUrl: "https://www.metacareers.com/jobs?q=" },
  "Facebook": { type: "custom", searchUrl: "https://www.metacareers.com/jobs?q=" },
  "Apple": { type: "custom", searchUrl: "https://jobs.apple.com/en-us/search?search=" },
  "Amazon": { type: "custom", searchUrl: "https://www.amazon.jobs/en/search?base_query=" },
  "Tesla": { type: "custom", searchUrl: "https://www.tesla.com/careers/search/?query=" },
  "Oracle": { type: "custom", searchUrl: "https://careers.oracle.com/jobs/#en/sites/jobsearch/requisitions?keyword=" },
  "IBM": { type: "custom", searchUrl: "https://careers.ibm.com/job-search?query=" },
  "Intel": { type: "custom", searchUrl: "https://jobs.intel.com/en/search-jobs/" },
  "Adobe": { type: "custom", searchUrl: "https://careers.adobe.com/us/en/search-results?keywords=" },
  "Salesforce": { type: "custom", searchUrl: "https://careers.salesforce.com/en/jobs/?search=" },
  
  // Workday systems
  "Nvidia": { type: "workday", company: "NVIDIA", tenant: "nvidia" },
  "AMD": { type: "workday", company: "AMD", tenant: "amd" },
  "Qualcomm": { type: "workday", company: "Qualcomm", tenant: "qualcomm" },
  "Visa": { type: "workday", company: "Visa", tenant: "visa" },
  "ServiceNow": { type: "workday", company: "ServiceNow", tenant: "servicenow" }
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
  console.log("📡 Fetching SimplifyJobs data...")
  
  const response = await fetch('https://raw.githubusercontent.com/SimplifyJobs/Summer2025-Internships/dev/README.md')
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

// Step 2: Try to find direct link on company career page
async function findDirectLink(job: SimplifyJob): Promise<string | null> {
  const mapping = COMPANY_CAREER_MAPPINGS[job.company] || 
                  COMPANY_CAREER_MAPPINGS[job.company.split(' ')[0]] // Try first word only
  
  if (!mapping) {
    console.log(`❌ No mapping for ${job.company}`)
    return null
  }
  
  try {
    // Handle Greenhouse
    if (mapping.type === 'greenhouse') {
      const url = `https://boards.greenhouse.io/${mapping.slug}`
      const response = await fetch(url)
      if (!response.ok) return null
      
      const html = await response.text()
      
      // Search for the role title in the HTML
      const roleKeywords = job.role.toLowerCase()
        .replace('software engineering', 'software engineer')
        .replace('swe ', 'software engineer ')
        .split(' ')
        .filter(word => word.length > 3) // Filter short words
      
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
    if (mapping.type === 'lever') {
      const url = `https://jobs.lever.co/${mapping.slug}`
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
    
    // Handle custom career sites (return search URL)
    if (mapping.type === 'custom' && mapping.searchUrl) {
      // For these, we return a search URL that will show relevant results
      const searchQuery = encodeURIComponent(`${job.role} intern 2026`)
      return `${mapping.searchUrl}${searchQuery}`
    }
    
    // Handle Workday (return general careers page)
    if (mapping.type === 'workday') {
      return `https://${mapping.tenant}.wd1.myworkdayjobs.com/en-US/${mapping.company}`
    }
    
  } catch (error: any) {
    console.log(`⚠️ Error finding link for ${job.company}: ${error.message}`)
  }
  
  return null
}

// Step 3: Quick fallback - Google search for career page
async function googleSearchCareerPage(company: string, role: string): Promise<string | null> {
  try {
    // Build a Google search URL (users will need to click through)
    const query = encodeURIComponent(`${company} careers ${role} intern apply`)
    return `https://www.google.com/search?q=${query}&btnI=1` // I'm Feeling Lucky
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
    
    // Step 1: Discover jobs from SimplifyJobs
    const simplifyJobs = await discoverJobsFromSimplify()
    
    console.log(`\n🔍 Processing ${simplifyJobs.length} jobs...`)
    
    const processedJobs = []
    let successCount = 0
    let fallbackCount = 0
    
    // Process in batches to avoid overwhelming servers
    const batchSize = 10
    for (let i = 0; i < Math.min(simplifyJobs.length, 200); i += batchSize) { // Limit to 200 for quick launch
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
