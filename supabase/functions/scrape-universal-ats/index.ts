import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ATS configurations with their specific selectors
const ATS_CONFIGS = {
  greenhouse: {
    urlPattern: /boards\.greenhouse\.io/,
    jobsSelector: '.opening',
    titleSelector: 'a[data-qa="job-title"]',
    locationSelector: '.location',
    linkSelector: 'a[data-qa="job-title"]',
    baseUrl: (company: string) => `https://boards.greenhouse.io/${company}`
  },
  lever: {
    urlPattern: /jobs\.lever\.co/,
    jobsSelector: '.posting',
    titleSelector: '.posting-title h5',
    locationSelector: '.posting-categories .location',
    linkSelector: '.posting-apply a',
    baseUrl: (company: string) => `https://jobs.lever.co/${company}`
  },
  workday: {
    urlPattern: /myworkdayjobs\.com/,
    apiEndpoint: true,
    getApiUrl: (company: string, tenant: string) => 
      `https://${tenant}.wd1.myworkdayjobs.com/wday/cxs/${tenant}/${company}/jobs`,
    parseApi: true
  },
  smartrecruiters: {
    urlPattern: /jobs\.smartrecruiters\.com/,
    apiEndpoint: true,
    getApiUrl: (company: string) => 
      `https://api.smartrecruiters.com/v1/companies/${company}/postings`,
    parseApi: true
  }
}

// Company registry with their ATS info
const COMPANY_REGISTRY = [
  { name: "Meta", ats: "workday", tenant: "facebook", slug: "careers" },
  { name: "Google", ats: "custom", careerUrl: "https://careers.google.com/api/v3/search/" },
  { name: "Microsoft", ats: "custom", careerUrl: "https://careers.microsoft.com/api/jobs" },
  { name: "Apple", ats: "custom", careerUrl: "https://jobs.apple.com/api/v1/jobSearch" },
  { name: "Amazon", ats: "custom", careerUrl: "https://www.amazon.jobs/api/jobs" },
  { name: "Stripe", ats: "greenhouse", slug: "stripe" },
  { name: "Coinbase", ats: "greenhouse", slug: "coinbase" },
  { name: "Databricks", ats: "greenhouse", slug: "databricks" },
  { name: "Uber", ats: "greenhouse", slug: "uber" },
  { name: "Airbnb", ats: "greenhouse", slug: "airbnb" },
  { name: "Netflix", ats: "lever", slug: "netflix" },
  { name: "Spotify", ats: "lever", slug: "spotify" },
  { name: "Square", ats: "lever", slug: "block" },
  { name: "Tesla", ats: "custom", careerUrl: "https://www.tesla.com/api/careers/search" },
  { name: "Oracle", ats: "taleo", baseUrl: "https://oracle.taleo.net" },
]

interface JobPosting {
  company: string
  role_title: string
  location: string
  application_link: string
  direct_link: string
  link_type: 'direct'
  tech_stack: string[]
  visa_sponsorship: string | null
  is_texas: boolean
  remote_flag: boolean
  scrape_source: string
  jd_summary: string | null
  date_posted: string | null
  salary_min: number | null
  salary_max: number | null
}

// Texas location detection
function isTexasLocation(location: string): boolean {
  const texasIndicators = [
    'texas', 'tx', 'austin', 'dallas', 'houston', 'san antonio',
    'fort worth', 'el paso', 'arlington', 'plano', 'irving',
    'richardson', 'round rock', 'college station', 'lubbock'
  ]
  const locationLower = location.toLowerCase()
  return texasIndicators.some(indicator => locationLower.includes(indicator))
}

// Extract tech stack from job title and description
function extractTechStack(title: string, description?: string): string[] {
  const techKeywords = [
    'react', 'angular', 'vue', 'javascript', 'typescript', 'python',
    'java', 'c++', 'golang', 'rust', 'kubernetes', 'docker', 'aws',
    'azure', 'gcp', 'tensorflow', 'pytorch', 'sql', 'nosql', 'graphql',
    'node', 'django', 'flask', 'spring', 'rails', 'swift', 'kotlin'
  ]
  
  const text = `${title} ${description || ''}`.toLowerCase()
  return techKeywords.filter(tech => text.includes(tech))
}

// Scrape HTML-based ATS systems
async function scrapeHtmlAts(company: any, config: any): Promise<JobPosting[]> {
  const url = config.baseUrl(company.slug)
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; RaiderMatch/1.0; +https://raidermatch.com)'
    }
  })
  
  if (!response.ok) throw new Error(`Failed to fetch ${url}`)
  
  const html = await response.text()
  const doc = new DOMParser().parseFromString(html, 'text/html')
  
  const jobs: JobPosting[] = []
  const jobElements = doc.querySelectorAll(config.jobsSelector)
  
  jobElements.forEach(element => {
    const titleEl = element.querySelector(config.titleSelector)
    const locationEl = element.querySelector(config.locationSelector)
    const linkEl = element.querySelector(config.linkSelector)
    
    if (!titleEl || !linkEl) return
    
    const title = titleEl.textContent?.trim() || ''
    const location = locationEl?.textContent?.trim() || 'Remote'
    
    // Filter for internship roles
    if (!title.toLowerCase().includes('intern')) return
    
    // Build direct link
    let directLink = linkEl.getAttribute('href') || ''
    if (!directLink.startsWith('http')) {
      directLink = new URL(directLink, url).toString()
    }
    
    jobs.push({
      company: company.name,
      role_title: title,
      location: location,
      application_link: directLink,
      direct_link: directLink,
      link_type: 'direct',
      tech_stack: extractTechStack(title),
      visa_sponsorship: null,
      is_texas: isTexasLocation(location),
      remote_flag: location.toLowerCase().includes('remote'),
      scrape_source: `${company.ats}_scraper`,
      jd_summary: null,
      date_posted: new Date().toISOString().split('T')[0],
      salary_min: null,
      salary_max: null
    })
  })
  
  return jobs
}

// Scrape API-based ATS systems
async function scrapeApiAts(company: any, config: any): Promise<JobPosting[]> {
  let apiUrl: string
  
  if (company.ats === 'workday') {
    apiUrl = config.getApiUrl(company.slug, company.tenant)
    
    // Workday requires POST request with specific payload
    const payload = {
      limit: 100,
      offset: 0,
      searchText: "intern",
      jobFamilyGroup: [],
      locations: [],
      selectedFields: {
        job: true,
        location: true,
        postedDate: true
      }
    }
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0'
      },
      body: JSON.stringify(payload)
    })
    
    if (!response.ok) return []
    
    const data = await response.json()
    const jobs: JobPosting[] = []
    
    data.jobPostings?.forEach((posting: any) => {
      const title = posting.title
      const location = posting.locationsText || 'Remote'
      const jobPath = posting.externalPath
      const directLink = `https://${company.tenant}.wd1.myworkdayjobs.com/en-US/${company.slug}${jobPath}`
      
      jobs.push({
        company: company.name,
        role_title: title,
        location: location,
        application_link: directLink,
        direct_link: directLink,
        link_type: 'direct',
        tech_stack: extractTechStack(title),
        visa_sponsorship: null,
        is_texas: isTexasLocation(location),
        remote_flag: location.toLowerCase().includes('remote'),
        scrape_source: 'workday_api',
        jd_summary: posting.bulletFields?.join(' ') || null,
        date_posted: posting.postedOn,
        salary_min: null,
        salary_max: null
      })
    })
    
    return jobs
  }
  
  // SmartRecruiters API
  if (company.ats === 'smartrecruiters') {
    apiUrl = config.getApiUrl(company.slug)
    const response = await fetch(`${apiUrl}?limit=100&q=intern`)
    
    if (!response.ok) return []
    
    const data = await response.json()
    const jobs: JobPosting[] = []
    
    data.content?.forEach((posting: any) => {
      jobs.push({
        company: company.name,
        role_title: posting.name,
        location: posting.location?.city || 'Remote',
        application_link: posting.applyUrl,
        direct_link: posting.applyUrl,
        link_type: 'direct',
        tech_stack: extractTechStack(posting.name),
        visa_sponsorship: null,
        is_texas: isTexasLocation(posting.location?.city || ''),
        remote_flag: posting.location?.remote || false,
        scrape_source: 'smartrecruiters_api',
        jd_summary: posting.jobAd?.sections?.jobDescription?.text || null,
        date_posted: posting.releasedDate,
        salary_min: posting.compensation?.min || null,
        salary_max: posting.compensation?.max || null
      })
    })
    
    return jobs
  }
  
  return []
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting Universal ATS scraper...')
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Process in batches to avoid timeouts
    const batchSize = 10
    const allJobs: JobPosting[] = []
    let successfulCompanies = 0
    let failedCompanies = 0
    
    for (let i = 0; i < COMPANY_REGISTRY.length; i += batchSize) {
      const batch = COMPANY_REGISTRY.slice(i, i + batchSize)
      console.log(`Processing batch ${i / batchSize + 1} of ${Math.ceil(COMPANY_REGISTRY.length / batchSize)}`)
      
      const batchPromises = batch.map(async (company) => {
        try {
          const config = ATS_CONFIGS[company.ats as keyof typeof ATS_CONFIGS]
          
          if (!config) {
            console.log(`No config for ${company.ats} (${company.name})`)
            return []
          }
          
          if (config.apiEndpoint) {
            return await scrapeApiAts(company, config)
          } else {
            return await scrapeHtmlAts(company, config)
          }
        } catch (error) {
          console.error(`Error scraping ${company.name}:`, error)
          return []
        }
      })
      
      const batchResults = await Promise.allSettled(batchPromises)
      batchResults.forEach((result, idx) => {
        if (result.status === 'fulfilled' && result.value.length > 0) {
          allJobs.push(...result.value)
          successfulCompanies++
        } else if (result.status === 'fulfilled' && result.value.length === 0) {
          failedCompanies++
        } else {
          failedCompanies++
        }
      })
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    console.log(`Scraped ${allJobs.length} jobs from ${successfulCompanies} companies`)
    
    // Deduplicate jobs
    const uniqueJobs = allJobs.reduce((acc: JobPosting[], job) => {
      const key = `${job.company}-${job.role_title}-${job.location}`
      if (!acc.find(j => `${j.company}-${j.role_title}-${j.location}` === key)) {
        acc.push(job)
      }
      return acc
    }, [])
    
    console.log(`After deduplication: ${uniqueJobs.length} unique jobs`)
    
    // Batch insert to database
    let insertedCount = 0
    let skippedCount = 0
    
    if (uniqueJobs.length > 0) {
      // Check for existing jobs to avoid duplicates
      for (const job of uniqueJobs) {
        const { data: existing } = await supabase
          .from('internships')
          .select('id')
          .eq('company', job.company)
          .eq('application_link', job.application_link)
          .single()
        
        if (!existing) {
          const { error } = await supabase
            .from('internships')
            .insert(job)
          
          if (!error) {
            insertedCount++
          } else {
            console.error('Insert error:', error)
            skippedCount++
          }
        } else {
          skippedCount++
        }
      }
    }
    
    const response = {
      success: true,
      jobsScraped: allJobs.length,
      uniqueJobs: uniqueJobs.length,
      inserted: insertedCount,
      skipped: skippedCount,
      texasJobs: uniqueJobs.filter(j => j.is_texas).length,
      companiesSuccess: successfulCompanies,
      companiesFailed: failedCompanies,
      companies: [...new Set(uniqueJobs.map(j => j.company))].sort()
    }
    
    console.log('Scraper completed:', response)
    
    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    console.error('Scraper error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
