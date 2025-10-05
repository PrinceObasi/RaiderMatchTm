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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { simplify_url, internship_id } = await req.json()
    
    if (!simplify_url) {
      throw new Error('simplify_url is required')
    }

    console.log(`Enriching from Simplify: ${simplify_url}`)
    
    const html = await fetchWithRetry(simplify_url)
    const doc = new DOMParser().parseFromString(html, 'text/html')
    
    if (!doc) {
      throw new Error('Failed to parse HTML')
    }

    // Extract structured data
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
    
    const direct_link = extractDirectAtsLink(html, doc)
    
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
      jd_summary: description.slice(0, 500) || undefined,
      description_html: description_html || undefined,
      requirements: requirements.length > 0 ? requirements : undefined,
      responsibilities: responsibilities.length > 0 ? responsibilities : undefined,
      direct_link: direct_link || undefined,
      source: 'simplify',
      source_url: simplify_url,
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
      // Try to find by simplify_url
      result = await supabase
        .from('internships')
        .update(updateData)
        .eq('application_link', simplify_url)
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
