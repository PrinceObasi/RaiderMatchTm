export interface CompanyMapping {
  company: string
  aliases?: string[]
  ats_type: 'greenhouse' | 'lever' | 'workday' | 'ashby' | 'custom'
  ats_identifier?: string
  career_url?: string
  search_pattern?: string
  notes?: string
}

// Golden database of company ATS mappings - maintain and expand this!
export const COMPANY_DATABASE: CompanyMapping[] = [
  // ================== GREENHOUSE COMPANIES ==================
  { company: "Stripe", ats_type: "greenhouse", ats_identifier: "stripe" },
  { company: "Coinbase", ats_type: "greenhouse", ats_identifier: "coinbase" },
  { company: "Databricks", ats_type: "greenhouse", ats_identifier: "databricks" },
  { company: "Uber", ats_type: "greenhouse", ats_identifier: "uber" },
  { company: "Airbnb", ats_type: "greenhouse", ats_identifier: "airbnb" },
  { company: "Figma", ats_type: "greenhouse", ats_identifier: "figma" },
  { company: "Discord", ats_type: "greenhouse", ats_identifier: "discord" },
  { company: "Roblox", ats_type: "greenhouse", ats_identifier: "roblox" },
  { company: "Scale AI", ats_type: "greenhouse", ats_identifier: "scaleai" },
  { company: "Anthropic", ats_type: "greenhouse", ats_identifier: "anthropic" },
  { company: "Chime", ats_type: "greenhouse", ats_identifier: "chime" },
  { company: "Brex", ats_type: "greenhouse", ats_identifier: "brex" },
  { company: "Plaid", ats_type: "greenhouse", ats_identifier: "plaid" },
  { company: "Nuro", ats_type: "greenhouse", ats_identifier: "nuro" },
  { company: "Samsara", ats_type: "greenhouse", ats_identifier: "samsara" },
  { company: "Affirm", ats_type: "greenhouse", ats_identifier: "affirm" },
  { company: "Indeed", ats_type: "greenhouse", ats_identifier: "indeed" },
  { company: "Capital One", ats_type: "greenhouse", ats_identifier: "capitalone" },
  { company: "DoorDash", ats_type: "greenhouse", ats_identifier: "doordash" },
  { company: "Robinhood", ats_type: "greenhouse", ats_identifier: "robinhood" },
  { company: "Lime", ats_type: "greenhouse", ats_identifier: "lime" },
  { company: "Bird", ats_type: "greenhouse", ats_identifier: "bird" },
  { company: "Canva", ats_type: "greenhouse", ats_identifier: "canva" },
  { company: "Benchling", ats_type: "greenhouse", ats_identifier: "benchling" },
  { company: "Flexport", ats_type: "greenhouse", ats_identifier: "flexport" },
  { company: "Carta", ats_type: "greenhouse", ats_identifier: "carta" },
  { company: "Airtable", ats_type: "greenhouse", ats_identifier: "airtable" },
  { company: "HashiCorp", ats_type: "greenhouse", ats_identifier: "hashicorp" },
  { company: "MongoDB", ats_type: "greenhouse", ats_identifier: "mongodb" },
  { company: "Elastic", ats_type: "greenhouse", ats_identifier: "elastic" },
  { company: "Confluent", ats_type: "greenhouse", ats_identifier: "confluent" },
  { company: "Snowflake", ats_type: "greenhouse", ats_identifier: "snowflake" },
  { company: "Datadog", ats_type: "greenhouse", ats_identifier: "datadog" },
  { company: "PagerDuty", ats_type: "greenhouse", ats_identifier: "pagerduty" },
  { company: "Okta", ats_type: "greenhouse", ats_identifier: "okta" },
  { company: "Twilio", ats_type: "greenhouse", ats_identifier: "twilio" },
  { company: "SendGrid", ats_type: "greenhouse", ats_identifier: "sendgrid" },
  { company: "American Express", ats_type: "greenhouse", ats_identifier: "americanexpress" },
  { company: "Jane Street", ats_type: "greenhouse", ats_identifier: "janestreet" },
  { company: "Two Sigma", ats_type: "greenhouse", ats_identifier: "twosigma" },
  { company: "Citadel", ats_type: "greenhouse", ats_identifier: "citadel" },
  { company: "HRT", aliases: ["Hudson River Trading"], ats_type: "greenhouse", ats_identifier: "hrt" },
  { company: "Jump Trading", ats_type: "greenhouse", ats_identifier: "jumptrading" },
  { company: "IMC Trading", ats_type: "greenhouse", ats_identifier: "imc" },
  { company: "Optiver", ats_type: "greenhouse", ats_identifier: "optiver" },
  { company: "HubSpot", ats_type: "greenhouse", ats_identifier: "hubspot" },
  { company: "Wayfair", ats_type: "greenhouse", ats_identifier: "wayfair" },
  { company: "Toast", ats_type: "greenhouse", ats_identifier: "toast" },
  { company: "Mastercard", ats_type: "greenhouse", ats_identifier: "mastercard" },
  { company: "H-E-B", aliases: ["HEB"], ats_type: "greenhouse", ats_identifier: "heb" },
  
  // ================== LEVER COMPANIES ==================
  { company: "Netflix", ats_type: "lever", ats_identifier: "netflix" },
  { company: "Spotify", ats_type: "lever", ats_identifier: "spotify" },
  { company: "Snap", aliases: ["Snapchat"], ats_type: "lever", ats_identifier: "snap" },
  { company: "Block", aliases: ["Square"], ats_type: "lever", ats_identifier: "block" },
  { company: "Twitch", ats_type: "lever", ats_identifier: "twitch" },
  { company: "Reddit", ats_type: "lever", ats_identifier: "reddit" },
  { company: "Palantir", ats_type: "lever", ats_identifier: "palantir" },
  { company: "Yelp", ats_type: "lever", ats_identifier: "yelp" },
  { company: "Instacart", ats_type: "lever", ats_identifier: "instacart" },
  { company: "Gusto", ats_type: "lever", ats_identifier: "gusto" },
  { company: "Convoy", ats_type: "lever", ats_identifier: "convoy" },
  { company: "GitLab", ats_type: "lever", ats_identifier: "gitlab" },
  { company: "Shopify", ats_type: "lever", ats_identifier: "shopify" },
  { company: "Cloudflare", ats_type: "lever", ats_identifier: "cloudflare" },
  { company: "DigitalOcean", ats_type: "lever", ats_identifier: "digitalocean" },
  { company: "Etsy", ats_type: "lever", ats_identifier: "etsy" },
  { company: "Roku", ats_type: "lever", ats_identifier: "roku" },
  { company: "Peloton", ats_type: "lever", ats_identifier: "onepeloton" },
  { company: "Notion", ats_type: "lever", ats_identifier: "notion" },
  { company: "Asana", ats_type: "lever", ats_identifier: "asana" },
  { company: "Atlassian", ats_type: "lever", ats_identifier: "atlassian" },
  { company: "Slack", ats_type: "lever", ats_identifier: "slack" },
  { company: "Pinterest", ats_type: "lever", ats_identifier: "pinterest" },
  { company: "Lyft", ats_type: "lever", ats_identifier: "lyft" },
  { company: "Grammarly", ats_type: "lever", ats_identifier: "grammarly" },
  { company: "Duolingo", ats_type: "lever", ats_identifier: "duolingo" },
  { company: "Coursera", ats_type: "lever", ats_identifier: "coursera" },
  { company: "Khan Academy", ats_type: "lever", ats_identifier: "khanacademy" },
  
  // ================== ASHBY COMPANIES ==================
  { company: "OpenAI", ats_type: "ashby", ats_identifier: "openai", career_url: "https://openai.com/careers/search" },
  { company: "Perplexity", ats_type: "ashby", ats_identifier: "perplexity", career_url: "https://jobs.ashbyhq.com/perplexity" },
  { company: "Replit", ats_type: "ashby", ats_identifier: "replit", career_url: "https://jobs.ashbyhq.com/replit" },
  { company: "Vercel", ats_type: "ashby", ats_identifier: "vercel", career_url: "https://jobs.ashbyhq.com/vercel" },
  { company: "Linear", ats_type: "ashby", ats_identifier: "linear", career_url: "https://jobs.ashbyhq.com/linear" },
  { company: "Runway", ats_type: "ashby", ats_identifier: "runway", career_url: "https://jobs.ashbyhq.com/runway" },
  
  // ================== CUSTOM CAREER SITES ==================
  { 
    company: "Microsoft", 
    ats_type: "custom", 
    career_url: "https://careers.microsoft.com/v2/global/en/search-results.html",
    search_pattern: "?keywords={query}"
  },
  { 
    company: "Google", 
    ats_type: "custom", 
    career_url: "https://www.google.com/about/careers/applications/jobs/results/",
    search_pattern: "?q={query}"
  },
  { 
    company: "Meta", 
    aliases: ["Facebook"],
    ats_type: "custom", 
    career_url: "https://www.metacareers.com/jobs",
    search_pattern: "?q={query}"
  },
  { 
    company: "Apple", 
    ats_type: "custom", 
    career_url: "https://jobs.apple.com/en-us/search",
    search_pattern: "?search={query}"
  },
  { 
    company: "Amazon", 
    ats_type: "custom", 
    career_url: "https://www.amazon.jobs/en/search",
    search_pattern: "?base_query={query}"
  },
  { 
    company: "Tesla", 
    ats_type: "custom", 
    career_url: "https://www.tesla.com/careers/search/",
    search_pattern: "?query={query}"
  },
  { 
    company: "Oracle", 
    ats_type: "custom", 
    career_url: "https://careers.oracle.com/jobs/",
    search_pattern: "#en/sites/jobsearch/requisitions?keyword={query}"
  },
  { 
    company: "IBM", 
    ats_type: "custom", 
    career_url: "https://careers.ibm.com/job-search",
    search_pattern: "?query={query}"
  },
  { 
    company: "Intel", 
    ats_type: "custom", 
    career_url: "https://jobs.intel.com/en/search-jobs/",
    search_pattern: "{query}"
  },
  { 
    company: "Texas Instruments", 
    aliases: ["TI"],
    ats_type: "custom", 
    career_url: "https://careers.ti.com/search-jobs/",
    search_pattern: "{query}"
  },
  { 
    company: "Dell", 
    ats_type: "custom", 
    career_url: "https://jobs.dell.com/search-jobs/",
    search_pattern: "{query}"
  },
  { 
    company: "JPMorgan Chase", 
    aliases: ["JP Morgan", "JPMC"],
    ats_type: "custom", 
    career_url: "https://jpmc.fa.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1001/requisitions",
    search_pattern: "?keyword={query}"
  },
  { 
    company: "Goldman Sachs", 
    ats_type: "custom", 
    career_url: "https://www.goldmansachs.com/careers/students/programs/",
    notes: "Direct program pages, no search"
  },
  { 
    company: "Morgan Stanley", 
    ats_type: "custom", 
    career_url: "https://morganstanley.tal.net/vx/lang-en-GB/mobile-0/brand-2/xf-3786f0ce9359/candidate",
    notes: "Complex URL structure"
  },
  
  // ================== WORKDAY COMPANIES ==================
  { 
    company: "Nvidia", 
    ats_type: "workday",
    ats_identifier: "nvidia",
    career_url: "https://nvidia.wd1.myworkdayjobs.com/en-US/NVIDIAExternalCareerSite"
  },
  { 
    company: "AMD", 
    ats_type: "workday",
    ats_identifier: "amd",
    career_url: "https://amd.wd1.myworkdayjobs.com/en-US/AMD"
  },
  { 
    company: "Qualcomm", 
    ats_type: "workday",
    ats_identifier: "qualcomm",
    career_url: "https://qualcomm.wd5.myworkdayjobs.com/en-US/External"
  },
  { 
    company: "Visa", 
    ats_type: "workday",
    ats_identifier: "visa",
    career_url: "https://visa.wd1.myworkdayjobs.com/en-US/visa_external"
  },
  { 
    company: "ServiceNow", 
    ats_type: "workday",
    ats_identifier: "servicenow",
    career_url: "https://servicenow.wd1.myworkdayjobs.com/en-US/ServiceNow_Careers"
  },
  { 
    company: "Adobe", 
    ats_type: "workday",
    ats_identifier: "adobe",
    career_url: "https://adobe.wd5.myworkdayjobs.com/en-US/external_experienced"
  },
  { 
    company: "Salesforce", 
    ats_type: "workday",
    ats_identifier: "salesforce",
    career_url: "https://salesforce.wd1.myworkdayjobs.com/en-US/External_Career_Site"
  },
  { 
    company: "PayPal", 
    ats_type: "workday",
    ats_identifier: "paypal",
    career_url: "https://paypal.wd1.myworkdayjobs.com/en-US/jobs"
  },
  { 
    company: "VMware", 
    ats_type: "workday",
    ats_identifier: "vmware",
    career_url: "https://vmware.wd1.myworkdayjobs.com/en-US/VMware"
  },
  { 
    company: "Workday", 
    ats_type: "workday",
    ats_identifier: "workday",
    career_url: "https://workday.wd5.myworkdayjobs.com/en-US/Workday",
    notes: "Meta: Workday uses Workday"
  }
]

// Helper function to find company mapping with fuzzy matching
export function findCompanyMapping(companyName: string): CompanyMapping | null {
  const normalizedName = companyName.trim().toLowerCase()
  
  return COMPANY_DATABASE.find(mapping => {
    // Check main company name
    if (mapping.company.toLowerCase() === normalizedName) return true
    
    // Check aliases
    if (mapping.aliases) {
      if (mapping.aliases.some(alias => alias.toLowerCase() === normalizedName)) return true
    }
    
    // Check if SimplifyJobs name contains the company name
    if (mapping.company.toLowerCase().includes(normalizedName)) return true
    
    // Check if company name contains the mapping
    if (normalizedName.includes(mapping.company.toLowerCase())) return true
    
    return false
  }) || null
}

// Generate direct URL based on mapping
export function generateDirectUrl(mapping: CompanyMapping, roleTitle?: string): string {
  switch (mapping.ats_type) {
    case 'greenhouse':
      return `https://boards.greenhouse.io/${mapping.ats_identifier}`
      
    case 'lever':
      return `https://jobs.lever.co/${mapping.ats_identifier}`
      
    case 'ashby':
      return mapping.career_url || `https://jobs.ashbyhq.com/${mapping.ats_identifier}`
      
    case 'workday':
      return mapping.career_url || `https://${mapping.ats_identifier}.myworkdayjobs.com`
      
    case 'custom':
      if (mapping.career_url) {
        if (mapping.search_pattern && roleTitle) {
          const query = encodeURIComponent(roleTitle)
          const searchUrl = mapping.career_url + mapping.search_pattern.replace('{query}', query)
          return searchUrl
        }
        return mapping.career_url
      }
      return ''
      
    default:
      return ''
  }
}

// Export database stats for monitoring
export function getDatabaseStats() {
  const stats = {
    total: COMPANY_DATABASE.length,
    byATS: {
      greenhouse: COMPANY_DATABASE.filter(c => c.ats_type === 'greenhouse').length,
      lever: COMPANY_DATABASE.filter(c => c.ats_type === 'lever').length,
      ashby: COMPANY_DATABASE.filter(c => c.ats_type === 'ashby').length,
      workday: COMPANY_DATABASE.filter(c => c.ats_type === 'workday').length,
      custom: COMPANY_DATABASE.filter(c => c.ats_type === 'custom').length
    },
    withAliases: COMPANY_DATABASE.filter(c => c.aliases && c.aliases.length > 0).length
  }
  
  return stats
}

// Quick lookup by SimplifyJobs name
export function quickLookup(simplifyName: string): string | null {
  const mapping = findCompanyMapping(simplifyName)
  if (mapping) {
    return generateDirectUrl(mapping)
  }
  return null
}
