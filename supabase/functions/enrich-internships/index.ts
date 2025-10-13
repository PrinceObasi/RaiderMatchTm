import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { 
  stripHtml, 
  cleanHtml, 
  removeNonContent, 
  findMainContent, 
  extractLists,
  extractRequirementsFromText 
} from './html-utils.ts'

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
  'greenhouse.io', 'lever.co', 'myworkdayjobs.com', 'jobvite.com', 'icims.com',
  'smartrecruiters.com', 'successfactors.com', 'oraclecloud.com'
]

// HTML utilities moved to html-utils.ts

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

// Requirements extraction moved to html-utils.ts

function createSummary(role: string, company: string, location: string, text: string, tech: string[]): string {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20)
  
  if (sentences.length > 0) {
    const firstTwo = sentences.slice(0, 2).join('. ').trim()
    if (firstTwo.length > 30) {
      return firstTwo.length > 200 ? firstTwo.slice(0, 197) + '...' : firstTwo + '.'
    }
  }
  
  const topTech = tech.slice(0, 2).join(', ')
  return `Work as a ${role} at ${company} in ${location}${topTech ? ` on ${topTech}` : ''}.`
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
    const timeout = setTimeout(() => controller.abort(), 10000)
    
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: controller.signal
    })
    clearTimeout(timeout)
    
    if (!response.ok) return null
    
    const html = await response.text()
    return html.slice(0, 60000)
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
        let html = ''
        let sourceText = ''
        
        if (job.description_html) {
          html = job.description_html
        } else if (job.direct_link) {
          await new Promise(resolve => setTimeout(resolve, 200))
          const fetchedHtml = await fetchPageContent(job.direct_link)
          if (fetchedHtml) {
            html = fetchedHtml
          }
        }
        
        if (!html || html.length < 100) {
          skipped.push(job.id)
          console.log(`Skipped ${job.company} - insufficient content`)
          continue
        }
        
        // Clean and process HTML
        const cleaned = cleanHtml(html)
        const withoutNav = removeNonContent(cleaned)
        const mainContent = findMainContent(withoutNav)
        sourceText = stripHtml(mainContent || withoutNav)
        
        if (sourceText.length < 50) {
          skipped.push(job.id)
          console.log(`Skipped ${job.company} - insufficient text after cleaning`)
          continue
        }
        
        const limitedText = sourceText.slice(0, 6000)
        
        // Extract structured data
        const tech_stack = extractTechStack(limitedText)
        
        // Try to extract requirements from lists first
        const lists = extractLists(mainContent || withoutNav)
        let core_requirements: string[] = []
        
        for (const list of lists) {
          const firstItem = list[0]?.toLowerCase() || ''
          if (firstItem.includes('experience') || 
              firstItem.includes('skill') || 
              firstItem.includes('knowledge') ||
              firstItem.includes('proficien')) {
            core_requirements = list.slice(0, 8)
            break
          }
        }
        
        // Fallback to text extraction
        if (core_requirements.length === 0) {
          core_requirements = extractRequirementsFromText(limitedText)
        }
        
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
          updated_at: new Date().toISOString()
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
