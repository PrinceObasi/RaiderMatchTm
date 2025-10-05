// ATS allow-list regex for validating direct links - expanded to cover more ATS providers
export const ATS_REGEX = /(greenhouse\.io|lever\.co|myworkdayjobs\.com|workdayjobs\.com|icims\.com|smartrecruiters\.com|ashbyhq\.com|jobvite\.com|taleo\.net|eightfold\.ai|bamboohr\.com|successfactors\.com|oraclecloud\.com|adp\.com|dayforcehcm\.com|recruitee\.com|personio\.de|ukg\.com|ultipro\.com|breezy\.hr|jazz\.co|fountain\.com|paradox\.ai|teamtailor\.com|pinpointhq\.com|applytojob\.com|paylocity\.com|hrmdirect\.com)/i

// Company to ATS system mappings
export interface ATSMapping {
  company: string
  atsType: 'greenhouse' | 'lever' | 'workday' | 'icims' | 'ashby' | 'smartrecruiters' | 'other'
  baseUrl: string
  searchPattern?: string
}

export const COMPANY_ATS_MAP: ATSMapping[] = [
  // FAANG & Tech Giants
  { company: 'Google', atsType: 'greenhouse', baseUrl: 'https://www.google.com/about/careers/applications' },
  { company: 'Meta', atsType: 'greenhouse', baseUrl: 'https://www.metacareers.com' },
  { company: 'Amazon', atsType: 'icims', baseUrl: 'https://www.amazon.jobs' },
  { company: 'Microsoft', atsType: 'greenhouse', baseUrl: 'https://careers.microsoft.com' },
  { company: 'Apple', atsType: 'other', baseUrl: 'https://jobs.apple.com' },
  { company: 'Netflix', atsType: 'greenhouse', baseUrl: 'https://jobs.netflix.com' },
  
  // Unicorns & High-Growth
  { company: 'Uber', atsType: 'greenhouse', baseUrl: 'https://www.uber.com/careers' },
  { company: 'Airbnb', atsType: 'greenhouse', baseUrl: 'https://careers.airbnb.com' },
  { company: 'Stripe', atsType: 'greenhouse', baseUrl: 'https://stripe.com/jobs' },
  { company: 'Databricks', atsType: 'greenhouse', baseUrl: 'https://www.databricks.com/company/careers' },
  { company: 'Snowflake', atsType: 'greenhouse', baseUrl: 'https://careers.snowflake.com' },
  { company: 'Coinbase', atsType: 'greenhouse', baseUrl: 'https://www.coinbase.com/careers' },
  { company: 'Robinhood', atsType: 'greenhouse', baseUrl: 'https://robinhood.com/careers' },
  { company: 'DoorDash', atsType: 'lever', baseUrl: 'https://careers.doordash.com' },
  { company: 'Instacart', atsType: 'greenhouse', baseUrl: 'https://careers.instacart.com' },
  { company: 'Lyft', atsType: 'greenhouse', baseUrl: 'https://www.lyft.com/careers' },
  { company: 'Discord', atsType: 'greenhouse', baseUrl: 'https://discord.com/careers' },
  { company: 'Roblox', atsType: 'greenhouse', baseUrl: 'https://corp.roblox.com/careers' },
  { company: 'Figma', atsType: 'greenhouse', baseUrl: 'https://www.figma.com/careers' },
  { company: 'Notion', atsType: 'greenhouse', baseUrl: 'https://www.notion.so/careers' },
  { company: 'Canva', atsType: 'lever', baseUrl: 'https://www.canva.com/careers' },
  
  // Enterprise SaaS
  { company: 'Salesforce', atsType: 'workday', baseUrl: 'https://salesforce.wd12.myworkdayjobs.com/Salesforce' },
  { company: 'ServiceNow', atsType: 'workday', baseUrl: 'https://jobs.servicenow.com' },
  { company: 'Workday', atsType: 'workday', baseUrl: 'https://workday.wd5.myworkdayjobs.com/Workday' },
  { company: 'Oracle', atsType: 'workday', baseUrl: 'https://oracle.wd12.myworkdayjobs.com/careers' },
  { company: 'Adobe', atsType: 'workday', baseUrl: 'https://adobe.wd5.myworkdayjobs.com/external_experienced' },
  { company: 'SAP', atsType: 'workday', baseUrl: 'https://jobs.sap.com' },
  { company: 'Atlassian', atsType: 'greenhouse', baseUrl: 'https://www.atlassian.com/company/careers' },
  { company: 'MongoDB', atsType: 'greenhouse', baseUrl: 'https://www.mongodb.com/careers' },
  { company: 'Twilio', atsType: 'greenhouse', baseUrl: 'https://www.twilio.com/company/jobs' },
  { company: 'Dropbox', atsType: 'greenhouse', baseUrl: 'https://www.dropbox.com/jobs' },
  { company: 'Slack', atsType: 'greenhouse', baseUrl: 'https://slack.com/careers' },
  { company: 'Zoom', atsType: 'greenhouse', baseUrl: 'https://careers.zoom.us' },
  { company: 'Splunk', atsType: 'greenhouse', baseUrl: 'https://www.splunk.com/careers' },
  
  // Fintech
  { company: 'PayPal', atsType: 'workday', baseUrl: 'https://paypal.eightfold.ai/careers' },
  { company: 'Square', atsType: 'greenhouse', baseUrl: 'https://careers.squareup.com' },
  { company: 'Plaid', atsType: 'greenhouse', baseUrl: 'https://plaid.com/careers' },
  { company: 'Chime', atsType: 'greenhouse', baseUrl: 'https://www.chime.com/careers' },
  { company: 'Affirm', atsType: 'greenhouse', baseUrl: 'https://www.affirm.com/careers' },
  
  // Gaming
  { company: 'Electronic Arts', atsType: 'workday', baseUrl: 'https://ea.gr8people.com/jobs' },
  { company: 'Riot Games', atsType: 'greenhouse', baseUrl: 'https://www.riotgames.com/en/work-with-us' },
  { company: 'Epic Games', atsType: 'greenhouse', baseUrl: 'https://www.epicgames.com/site/careers' },
  { company: 'Unity', atsType: 'greenhouse', baseUrl: 'https://careers.unity.com' },
  
  // Social Media & Content
  { company: 'Twitter', atsType: 'greenhouse', baseUrl: 'https://careers.twitter.com' },
  { company: 'X', atsType: 'greenhouse', baseUrl: 'https://twitter.com/careers' },
  { company: 'Snap', atsType: 'greenhouse', baseUrl: 'https://www.snap.com/en-US/jobs' },
  { company: 'Snapchat', atsType: 'greenhouse', baseUrl: 'https://www.snap.com/en-US/jobs' },
  { company: 'TikTok', atsType: 'greenhouse', baseUrl: 'https://careers.tiktok.com' },
  { company: 'ByteDance', atsType: 'greenhouse', baseUrl: 'https://jobs.bytedance.com' },
  { company: 'Pinterest', atsType: 'greenhouse', baseUrl: 'https://www.pinterestcareers.com' },
  { company: 'Reddit', atsType: 'greenhouse', baseUrl: 'https://www.redditinc.com/careers' },
  
  // Hardware & Automotive
  { company: 'Tesla', atsType: 'greenhouse', baseUrl: 'https://www.tesla.com/careers' },
  { company: 'SpaceX', atsType: 'greenhouse', baseUrl: 'https://www.spacex.com/careers' },
  { company: 'Rivian', atsType: 'greenhouse', baseUrl: 'https://rivian.com/careers' },
  { company: 'Intel', atsType: 'workday', baseUrl: 'https://intel.wd1.myworkdayjobs.com/External' },
  { company: 'NVIDIA', atsType: 'workday', baseUrl: 'https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite' },
  { company: 'AMD', atsType: 'workday', baseUrl: 'https://jobs.amd.com' },
  { company: 'Qualcomm', atsType: 'workday', baseUrl: 'https://qualcomm.wd5.myworkdayjobs.com/External' },
  
  // E-commerce & Retail
  { company: 'Shopify', atsType: 'greenhouse', baseUrl: 'https://www.shopify.com/careers' },
  { company: 'Etsy', atsType: 'greenhouse', baseUrl: 'https://www.etsy.com/careers' },
  { company: 'Walmart', atsType: 'workday', baseUrl: 'https://careers.walmart.com' },
  { company: 'Target', atsType: 'workday', baseUrl: 'https://corporate.target.com/careers' },
  
  // Cybersecurity
  { company: 'CrowdStrike', atsType: 'greenhouse', baseUrl: 'https://www.crowdstrike.com/careers' },
  { company: 'Palo Alto Networks', atsType: 'greenhouse', baseUrl: 'https://jobs.paloaltonetworks.com' },
  { company: 'Okta', atsType: 'greenhouse', baseUrl: 'https://www.okta.com/company/careers' },
  
  // Cloud & Infrastructure
  { company: 'Cloudflare', atsType: 'greenhouse', baseUrl: 'https://www.cloudflare.com/careers' },
  { company: 'HashiCorp', atsType: 'greenhouse', baseUrl: 'https://www.hashicorp.com/careers' },
  { company: 'Datadog', atsType: 'greenhouse', baseUrl: 'https://www.datadoghq.com/careers' },
  { company: 'New Relic', atsType: 'greenhouse', baseUrl: 'https://newrelic.careers' },
  
  // AI & ML
  { company: 'OpenAI', atsType: 'greenhouse', baseUrl: 'https://openai.com/careers' },
  { company: 'Anthropic', atsType: 'greenhouse', baseUrl: 'https://www.anthropic.com/careers' },
  { company: 'Scale AI', atsType: 'greenhouse', baseUrl: 'https://scale.com/careers' },
  { company: 'Hugging Face', atsType: 'lever', baseUrl: 'https://huggingface.co/careers' },
]

export function findATSMapping(company: string): ATSMapping | null {
  const normalized = company.toLowerCase().trim()
  return COMPANY_ATS_MAP.find(m => 
    normalized.includes(m.company.toLowerCase()) || 
    m.company.toLowerCase().includes(normalized)
  ) || null
}

export function extractDomain(url: string): string | null {
  try {
    const parsed = new URL(url)
    return parsed.hostname
  } catch {
    return null
  }
}

export function isDirectATS(url: string): boolean {
  return ATS_REGEX.test(url)
}
