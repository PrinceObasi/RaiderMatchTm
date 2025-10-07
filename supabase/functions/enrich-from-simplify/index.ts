import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { DOMParser } from 'https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ATS_HOSTS = [
  'greenhouse.io', 'lever.co', 'myworkdayjobs.com',
  'jobvite.com', 'icims.com', 'smartrecruiters.com',
  'successfactors.com', 'eightfold.ai', 'breezy.hr',
  'jazz.co', 'fountain.com', 'paradox.ai'
]

async function fetchWithRetry(url: string, retries = 3): Promise<string> {
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 12000)
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        signal: controller.signal
      })
      clearTimeout(timeout)
      
      if (response.ok) {
        return await response.text()
      }
    } catch (error) {
      if (i === retries - 1) throw error
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000))
    }
  }
  throw new Error('Failed to fetch after retries')
}

function extractDirectAtsLink(html: string, doc: any): string | null {
  // Check all links for ATS domains
  const links = doc.querySelectorAll('a[href]')
  for (const link of links) {
    const href = link.getAttribute('href') || ''
    if (ATS_HOSTS.some(host => href.includes(host))) {
      return href
    }
  }
  
  // Check for redirects in meta tags
  const metaRefresh = doc.querySelector('meta[http-equiv="refresh"]')
  if (metaRefresh) {
    const content = metaRefresh.getAttribute('content') || ''
    const urlMatch = content.match(/url=(.+)/)
    if (urlMatch && ATS_HOSTS.some(host => urlMatch[1].includes(host))) {
      return urlMatch[1]
    }
  }
  
  return null
}

function extractLocations(doc: any): string[] {
  const locations: string[] = []
  
  // Try JSON-LD first
  const jsonLd = doc.querySelector('script[type="application/ld+json"]')
  if (jsonLd) {
    try {
      const data = JSON.parse(jsonLd.textContent)
      if (data.jobLocation) {
        const locs = Array.isArray(data.jobLocation) ? data.jobLocation : [data.jobLocation]
        locs.forEach((loc: any) => {
          if (loc.address?.addressLocality) {
            locations.push(`${loc.address.addressLocality}, ${loc.address.addressRegion || ''}`.trim())
          }
        })
      }
    } catch (e) {
      console.error('Failed to parse JSON-LD:', e)
    }
  }
  
  // Fallback: look for common location patterns
  if (locations.length === 0) {
    const text = doc.body?.textContent || ''
    const locMatches = text.match(/(?:Location|Office):\s*([^•\n]+)/gi)
    if (locMatches) {
      locMatches.forEach((match: string) => {
        const loc = match.split(':')[1]?.trim()
        if (loc && loc !== 'United States' && loc.length > 3) {
          locations.push(loc)
        }
      })
    }
  }
  
  return [...new Set(locations)] // Remove duplicates
}

function extractArrayData(doc: any, keywords: string[]): string[] {
  const items: string[] = []
  const lists = doc.querySelectorAll('ul, ol')
  
  for (const list of lists) {
    const prevText = list.previousElementSibling?.textContent?.toLowerCase() || ''
    const matchesKeyword = keywords.some(kw => prevText.includes(kw.toLowerCase()))
    
    if (matchesKeyword) {
      const listItems = list.querySelectorAll('li')
      listItems.forEach((li: any) => {
        const text = li.textContent?.trim()
        if (text && text.length > 5) {
          items.push(text)
        }
      })
    }
  }
  
  return items
}

function extractTechStack(text: string): string[] {
  const techKeywords = [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Go', 'Rust', 'Swift', 'Kotlin',
    'React', 'Vue', 'Angular', 'Node.js', 'Express', 'Django', 'Flask', 'Spring', 'ASP.NET',
    'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'DynamoDB', 'Cassandra',
    'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Jenkins', 'Git', 'GitHub', 'GitLab',
    'REST API', 'GraphQL', 'gRPC', 'Microservices', 'Machine Learning', 'AI', 'Data Science',
    'TensorFlow', 'PyTorch', 'Pandas', 'NumPy', 'Linux', 'Bash', 'CI/CD', 'Agile', 'Scrum'
  ]
  
  const found = new Set<string>()
  const lowerText = text.toLowerCase()
  
  for (const tech of techKeywords) {
    const lowerTech = tech.toLowerCase()
    if (lowerText.includes(lowerTech)) {
      found.add(tech)
    }
  }
  
  return Array.from(found)
}

function createRoleSummary(title: string, description: string, requirements: string[]): string {
  const sentences = description.split(/[.!?]+/).filter(s => s.trim().length > 20)
  const keyPhrases = sentences.slice(0, 2).join('. ').trim()
  
  if (keyPhrases.length > 200) {
    return keyPhrases.slice(0, 200) + '...'
  }
  
  if (requirements.length > 0) {
    return `${keyPhrases}. Key requirements include: ${requirements.slice(0, 2).map(r => r.slice(0, 50)).join(', ')}.`
  }
  
  return keyPhrases || description.slice(0, 200) + '...'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { direct_link, internship_id } = await req.json()
    
    if (!direct_link) {
      throw new Error('direct_link is required')
    }

    console.log(`Enriching from direct link: ${direct_link}`)
    
    const html = await fetchWithRetry(direct_link)
    const doc = new DOMParser().parseFromString(html, 'text/html')
    
    if (!doc) {
      throw new Error('Failed to parse HTML')
    }

    // Extract structured data from company ATS page
    const title = doc.querySelector('h1')?.textContent?.trim() ||
                  doc.querySelector('meta[property="og:title"]')?.getAttribute('content') || ''
    
    const company = doc.querySelector('[class*="company"]')?.textContent?.trim() ||
                    doc.querySelector('meta[property="og:site_name"]')?.getAttribute('content') || ''
    
    const locations = extractLocations(doc)
    
    const workModeText = doc.body?.textContent || ''
    let work_mode = null
    if (workModeText.includes('Remote')) work_mode = 'Remote'
    else if (workModeText.includes('Hybrid')) work_mode = 'Hybrid'
    else if (workModeText.includes('On-site') || workModeText.includes('Onsite')) work_mode = 'On-site'
    
    const visaText = doc.body?.textContent || ''
    let visa_policy = 'Unspecified'
    if (visaText.match(/sponsor.*visa|H-?1B.*sponsor/i)) visa_policy = 'Yes'
    else if (visaText.match(/no.*sponsor|not.*sponsor/i)) visa_policy = 'No'
    
    const deadlineMatch = doc.body?.textContent?.match(/deadline:?\s*([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i)
    let deadline = null
    if (deadlineMatch) {
      try {
        deadline = new Date(deadlineMatch[1]).toISOString().split('T')[0]
      } catch (e) {
        console.error('Failed to parse deadline:', e)
      }
    }
    
    const description = doc.querySelector('[class*="description"]')?.textContent?.trim() ||
                       doc.querySelector('meta[property="og:description"]')?.getAttribute('content') || ''
    
    const description_html = doc.querySelector('[class*="description"]')?.innerHTML || ''
    
    const requirements = extractArrayData(doc, ['Requirements', 'Qualifications', 'Required', 'Must have'])
    const responsibilities = extractArrayData(doc, ['Responsibilities', 'What you\'ll do', 'Role', 'Duties'])
    
    // Extract tech stack from entire page text
    const pageText = doc.body?.textContent || ''
    const tech_stack = extractTechStack(pageText)
    
    // Create focused role summary
    const role_summary = createRoleSummary(title, description, requirements)
    
    // Determine ATS type from URL
    let ats_type = 'unknown'
    if (direct_link.includes('greenhouse.io')) ats_type = 'greenhouse'
    else if (direct_link.includes('lever.co')) ats_type = 'lever'
    else if (direct_link.includes('myworkdayjobs.com')) ats_type = 'workday'
    else if (direct_link.includes('jobvite.com')) ats_type = 'jobvite'
    else if (direct_link.includes('icims.com')) ats_type = 'icims'
    else if (direct_link.includes('smartrecruiters.com')) ats_type = 'smartrecruiters'
    
    // Update database
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    const updateData: any = {
      role_title: title || undefined,
      company: company || undefined,
      locations: locations.length > 0 ? locations : undefined,
      work_mode: work_mode || undefined,
      visa_sponsorship: visa_policy,
      deadline: deadline || undefined,
      jd_summary: role_summary || undefined,
      description_html: description_html || undefined,
      tech_stack: tech_stack.length > 0 ? tech_stack : undefined,
      requirements: requirements.length > 0 ? requirements : undefined,
      responsibilities: responsibilities.length > 0 ? responsibilities : undefined,
      application_link: direct_link,
      direct_link: direct_link,
      is_direct: true,
      link_type: 'direct',
      final_domain: ats_type !== 'unknown' ? ats_type : undefined,
      enriched_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    // Remove undefined values
    Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key])
    
    let result
    if (internship_id) {
      result = await supabase
        .from('internships')
        .update(updateData)
        .eq('id', internship_id)
        .select()
        .single()
    } else {
      // Try to find by direct_link
      result = await supabase
        .from('internships')
        .update(updateData)
        .eq('direct_link', direct_link)
        .select()
        .maybeSingle()
    }
    
    if (result.error) {
      console.error('Database update error:', result.error)
      throw result.error
    }
    
    console.log(`Successfully enriched internship: ${title} at ${company}`)
    
    return new Response(
      JSON.stringify({ ok: true, job: result.data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Enrichment error:', error)
    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
