import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { DOMParser } from 'https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TECH_DICTIONARY = [
  'Python', 'Java', 'C++', 'C', 'C#', 'Go', 'Rust', 'JavaScript', 'TypeScript',
  'React', 'Node', 'Express', 'Vue', 'Angular', 'Django', 'Flask', 'Spring',
  '.NET', '.NET Core', 'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis',
  'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Linux', 'Git', 'Bash',
  'Terraform', 'Kafka', 'Spark', 'Hadoop', 'Pandas', 'NumPy', 'TensorFlow',
  'PyTorch', 'scikit-learn', 'MATLAB', 'Figma', 'Swift', 'Kotlin', 'Node.js'
]

const ATS_HOSTS = [
  'greenhouse.io', 'boards.greenhouse.io', 'lever.co', 'myworkdayjobs.com', 
  'jobvite.com', 'icims.com', 'smartrecruiters.com', 'successfactors.com', 
  'oraclecloud.com', 'ashbyhq.com', 'workable.com', 'bamboohr.com', 
  'taleo.net', 'recruitee.com', 'breezy.hr', 'eightfold.ai'
]

function extractATSChunk(html: string): string | null {
  const patterns = [
    /data-automation-id=["']jobPostingDescription["'][^>]*>([\s\S]*?)<\/div>/i,  // Workday
    /<div[^>]*id=["']content["'][^>]*>([\s\S]*?)<\/div>/i,                       // Greenhouse
    /<div[^>]*class=["'][^"']*(opening|content|job)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*class=["'][^"']*job-section[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,   // SmartRecruiters
    /<div[^>]*id=["']iCIMS_JobContent["'][^>]*>([\s\S]*?)<\/div>/i,              // iCIMS
    /<div[^>]*data-cy=["']job-description["'][^>]*>([\s\S]*?)<\/div>/i,          // Ashby
    /<main[^>]*>([\s\S]*?)<\/main>/i,
    /<article[^>]*>([\s\S]*?)<\/article>/i,
  ]
  for (const re of patterns) {
    const m = html.match(re)
    if (m) return m[1] || m[2]
  }
  return null
}

function stripHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractTechStack(text: string): string[] {
  const found = new Set<string>()
  const lowerText = text.toLowerCase()
  
  for (const tech of TECH_DICTIONARY) {
    if (lowerText.includes(tech.toLowerCase())) {
      found.add(tech)
    }
  }
  
  return Array.from(found)
}

function extractRequirements(text: string): string[] {
  const requirements: string[] = []
  const lines = text.split('\n')
  
  let inRequirements = false
  const reqHeaders = /requirements|qualifications|what you'll do|responsibilities|must have|required/i
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    if (reqHeaders.test(line)) {
      inRequirements = true
      continue
    }
    
    if (inRequirements && line.length > 10) {
      if (line.match(/^[•\-\*\d\.]/)) {
        const cleaned = line.replace(/^[•\-\*\d\.\)]+\s*/, '').trim()
        if (cleaned.length > 15 && cleaned.length < 200) {
          requirements.push(cleaned)
          if (requirements.length >= 6) break
        }
      } else if (requirements.length > 0) {
        break
      }
    }
  }
  
  return requirements.slice(0, 6)
}

function extractFromMeta(html: string): string | null {
  const metaDesc = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)
  if (metaDesc && metaDesc[1]) return metaDesc[1]
  
  const ogDesc = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i)
  if (ogDesc && ogDesc[1]) return ogDesc[1]
  
  return null
}

function pickBestParagraphs(text: string): string | null {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 30 && s.trim().length < 300)
  if (sentences.length > 0) {
    const firstTwo = sentences.slice(0, 2).join('. ').trim()
    if (firstTwo.length > 50) return firstTwo + '.'
  }
  
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 50 && p.trim().length < 500)
  if (paragraphs.length > 0) {
    return paragraphs[0].trim().replace(/\s+/g, ' ')
  }
  
  return null
}

function clampShort(text: string, max: number): string {
  if (text.length <= max) return text
  return text.substring(0, max - 3) + '...'
}

function pickSummary(html: string | null): string | null {
  if (!html) return null
  const meta = extractFromMeta(html)
  if (meta && meta.length > 80) return clampShort(meta, 450)
  const ats = extractATSChunk(html)
  const source = ats || html
  const para = pickBestParagraphs(source)
  return para ? clampShort(para, 450) : null
}

async function fetchPageContent(url: string): Promise<string | null> {
  try {
    const hostname = new URL(url).hostname
    const isATS = ATS_HOSTS.some(host => hostname.includes(host))
    
    if (!isATS) {
      console.log(`Skipping non-ATS URL: ${hostname}`)
      return null
    }
    
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000) // Increased timeout
    
    const response = await fetch(url, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      signal: controller.signal
    })
    clearTimeout(timeout)
    
    if (!response.ok) {
      console.log(`HTTP ${response.status} for ${url}`)
      return null
    }
    
    const html = await response.text()
    return html.slice(0, 100000) // Increased limit
  } catch (error) {
    console.error(`Fetch error for ${url}:`, error)
    return null
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { id, limit = 200, force = false } = await req.json().catch(() => ({}))
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    // Fetch internships needing enrichment
    let internships: any[] = []
    
    if (id) {
      const { data, error: fetchError } = await supabase
        .from('internships')
        .select('id, company, role_title, location, job_url, description_html, tech_stack, summary_text, description_text')
        .eq('id', id)
        .limit(1)
      
      if (fetchError) throw fetchError
      internships = data ?? []
    } else {
      const batchSize = typeof limit === 'number' ? Math.min(Math.max(limit, 1), 100) : 20
      const { data, error: fetchError } = await supabase
        .from('internships')
        .select('id, company, role_title, location, job_url, description_html, tech_stack, summary_text, description_text')
        .not('job_url', 'is', null)
        .or('summary_text.is.null,tech_stack.is.null')
        .limit(batchSize)
      
      if (fetchError) throw fetchError
      internships = data ?? []
    }
    
    const { error: fetchError } = { error: null }
    
    if (fetchError) {
      throw fetchError
    }
    
    if (!internships || internships.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: 'No internships need enrichment' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const enriched: any[] = []
    const skipped: string[] = []
    let processed = 0
    
    for (const job of internships) {
      processed++
      
      try {
        let sourceText = ''
        
        if (job.description_html) {
          sourceText = stripHtml(job.description_html)
        } else if (job.job_url) {
          await new Promise(resolve => setTimeout(resolve, 200))
          const html = await fetchPageContent(job.job_url)
          if (html) {
            sourceText = stripHtml(html)
          }
        }
        
        if (!sourceText || sourceText.length < 50) {
          skipped.push(job.id)
          console.log(`Skipped ${job.company} - insufficient content`)
          continue
        }
        
        const tech_stack = extractTechStack(sourceText)
        const core_requirements = extractRequirements(sourceText)
        const summary_text = pickSummary(sourceText)
        
        const updateData: any = {}
        
        if (summary_text) {
          updateData.summary_text = summary_text
          if (force || !job.description_text) {
            updateData.description_text = summary_text // keep UI in sync
          }
        }
        
        if (tech_stack?.length) {
          updateData.tech_stack = tech_stack
        }
        
        if (core_requirements?.length) {
          updateData.core_requirements = core_requirements
        }
        
        updateData.enriched_at = new Date().toISOString()
        updateData.updated_at = new Date().toISOString()
        
        const { error: updateError } = await supabase
          .from('internships')
          .update(updateData)
          .eq('id', job.id)
        
        if (updateError) {
          console.error(`Update error for ${job.id}:`, updateError)
          skipped.push(job.id)
        } else {
          enriched.push({
            id: job.id,
            company: job.company,
            role: job.role_title,
            summary_text,
            tech_stack: tech_stack.slice(0, 6),
            core_requirements: core_requirements.slice(0, 4)
          })
        }
        
      } catch (error) {
        console.error(`Error enriching ${job.id}:`, error)
        skipped.push(job.id)
      }
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        scanned: processed,
        enriched: enriched.length,
        skipped: skipped.length,
        sample: enriched.slice(0, 5)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error: any) {
    console.error('Enrichment error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
