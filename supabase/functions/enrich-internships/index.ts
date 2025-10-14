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

function stripHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  if (!doc || !doc.body) return ''
  
  // Remove script, style, and nav elements
  const toRemove = doc.querySelectorAll('script, style, nav, header, footer')
  toRemove.forEach(el => el.remove())
  
  return doc.body.textContent || ''
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

function createSummary(role: string, company: string, location: string, text: string, tech: string[]): string {
  // Try to extract meaningful content from the job description
  const patterns = [
    /(?:job description|overview|summary|about the role|position summary)[:\s]+(.*?)(?:responsibilities|requirements|qualifications)/is,
    /(?:the role|the position|the opportunity)[:\s]+(.*?)(?:responsibilities|requirements|what you)/is,
    /(?:description)[:\s]+(.*?)(?:responsibilities|requirements|desired)/is
  ]
  
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match && match[1] && match[1].trim().length > 50) {
      let desc = match[1].trim().replace(/\s+/g, ' ')
      if (desc.length > 200) {
        return desc.substring(0, 197) + '...'
      }
      return desc
    }
  }
  
  // Try extracting first substantive sentences
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 30 && s.trim().length < 200)
  if (sentences.length > 0) {
    const firstTwo = sentences.slice(0, 2).join('. ').trim()
    if (firstTwo.length > 50 && firstTwo.length <= 200) {
      return firstTwo + '.'
    }
    if (firstTwo.length > 200) {
      return firstTwo.substring(0, 197) + '...'
    }
  }
  
  // Look for paragraphs
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 50 && p.trim().length < 400)
  if (paragraphs.length > 0) {
    const para = paragraphs[0].trim().replace(/\s+/g, ' ')
    if (para.length > 200) {
      return para.substring(0, 197) + '...'
    }
    return para
  }
  
  // Only use generic fallback if we have tech to make it interesting
  const topTech = tech.slice(0, 3).join(', ')
  if (topTech && text.length > 100) {
    return `${role} position at ${company} in ${location} working with ${topTech}.`
  }
  
  // Last resort: first chunk of text if it looks substantive
  const firstChunk = text.substring(0, 250).trim().replace(/\s+/g, ' ')
  if (firstChunk.length > 100) {
    return firstChunk.substring(0, 197) + '...'
  }
  
  return `${role} at ${company} in ${location}.`
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
    const { limit = 200, force = false, use_llm = false } = await req.json()
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    // Fetch internships needing enrichment
    let query = supabase
      .from('internships')
      .select('id, company, role_title, location, direct_link, description_html, tech_stack')
      .limit(limit)
    
    if (!force) {
      query = query.or('summary_text.is.null,tech_stack.eq.{}')
    }
    
    const { data: internships, error: fetchError } = await query
    
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
        } else if (job.direct_link) {
          await new Promise(resolve => setTimeout(resolve, 200))
          const html = await fetchPageContent(job.direct_link)
          if (html) {
            sourceText = stripHtml(html)
          }
        }
        
        if (!sourceText || sourceText.length < 50) {
          skipped.push(job.id)
          console.log(`Skipped ${job.company} - insufficient content`)
          continue
        }
        
        const limitedText = sourceText.slice(0, 6000)
        
        const tech_stack = extractTechStack(limitedText)
        const core_requirements = extractRequirements(limitedText)
        const summary_text = createSummary(
          job.role_title || 'Software Engineering Intern',
          job.company,
          job.location || 'Various',
          limitedText,
          tech_stack
        )
        
        const updateData: any = {
          summary_text,
          tech_stack: tech_stack.length > 0 ? tech_stack : (job.tech_stack || []),
          core_requirements,
          enriched_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        // Also update description_text if force or empty
        if (force || !job.description_text) {
          updateData.description_text = summary_text;
        }
        
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
