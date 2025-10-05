// ATS allow-list regex for validating direct links
export const ATS_REGEX = /(greenhouse\.io|lever\.co|myworkdayjobs\.com|workdayjobs\.com|icims\.com|smartrecruiters\.com|ashbyhq\.com|jobvite\.com|taleo\.net|eightfold\.ai|bamboohr\.com|successfactors\.com|oraclecloud\.com|adp\.com|dayforcehcm\.com|recruitee\.com|personio\.de|ukg\.com|ultipro\.com)/i

// Company to ATS system mappings
export interface ATSMapping {
  company: string
  atsType: 'greenhouse' | 'lever' | 'workday' | 'icims' | 'ashby' | 'smartrecruiters' | 'other'
  baseUrl: string
  searchPattern?: string
}

export const COMPANY_ATS_MAP: ATSMapping[] = [
  { company: 'Google', atsType: 'greenhouse', baseUrl: 'https://www.google.com/about/careers/applications' },
  { company: 'Meta', atsType: 'greenhouse', baseUrl: 'https://www.metacareers.com' },
  { company: 'Amazon', atsType: 'icims', baseUrl: 'https://www.amazon.jobs' },
  { company: 'Microsoft', atsType: 'greenhouse', baseUrl: 'https://careers.microsoft.com' },
  { company: 'Apple', atsType: 'other', baseUrl: 'https://jobs.apple.com' },
  { company: 'Netflix', atsType: 'greenhouse', baseUrl: 'https://jobs.netflix.com' },
  { company: 'Uber', atsType: 'greenhouse', baseUrl: 'https://www.uber.com/careers' },
  { company: 'Airbnb', atsType: 'greenhouse', baseUrl: 'https://careers.airbnb.com' },
  { company: 'Stripe', atsType: 'greenhouse', baseUrl: 'https://stripe.com/jobs' },
  { company: 'Databricks', atsType: 'greenhouse', baseUrl: 'https://www.databricks.com/company/careers' },
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
