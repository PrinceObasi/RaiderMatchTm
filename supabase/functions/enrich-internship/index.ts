import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { id } = await req.json()
    
    if (!id) {
      return new Response(
        JSON.stringify({ error: 'Internship ID required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Starting enrichment for internship ${id}`)

    // Get the internship record with company and role_title
    const { data: internship, error: fetchError } = await supabaseClient
      .from('internships')
      .select('application_link, company, role_title')
      .eq('id', id)
      .single()

    if (fetchError || !internship) {
      console.error('Internship fetch error:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Internship not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!internship.application_link) {
      return new Response(
        JSON.stringify({ error: 'No application URL found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Fetching job page: ${internship.application_link}`)

    // Fetch the job page with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout

    let html: string
    try {
      const response = await fetch(internship.application_link, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      html = await response.text()
      console.log(`Successfully fetched HTML, length: ${html.length}`)
    } catch (fetchError) {
      clearTimeout(timeoutId)
      console.error('Fetch error:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch job page' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Enrich with AI
    const enrichmentData = await enrichWithAI(html, internship.company, internship.role_title)
    console.log('AI enriched data:', { 
      summaryLength: enrichmentData.summary.length, 
      techCount: enrichmentData.tech_stack.length,
      confidence: enrichmentData.confidence 
    })

    // Fail if enrichment confidence is too low
    if (enrichmentData.confidence === 0) {
      return new Response(
        JSON.stringify({ error: enrichmentData.summary }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update the database
    const { error: updateError } = await supabaseClient
      .from('internships')
      .update({
        jd_raw: html.substring(0, 50000), // Limit raw HTML size
        summary_text: enrichmentData.summary,
        tech_stack: enrichmentData.tech_stack,
        enrichment_confidence: enrichmentData.confidence,
        enriched_at: new Date().toISOString()
      })
      .eq('id', id)

    if (updateError) {
      console.error('Database update error:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to update database' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Enrichment completed successfully')

    return new Response(
      JSON.stringify({
        ok: true,
        company: internship.company,
        role: internship.role_title,
        summary: enrichmentData.summary,
        tech_stack: enrichmentData.tech_stack,
        confidence: enrichmentData.confidence
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Enrichment error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Clean HTML content for AI processing
function cleanHtmlForAI(html: string): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  if (!doc) return html
  
  // Remove script, style, nav, footer, ads
  const removeSelectors = ['script', 'style', 'nav', 'footer', 'header', '.nav', '.footer', '.header', '[class*="ad"]', '[id*="ad"]']
  removeSelectors.forEach(selector => {
    const elements = doc.querySelectorAll(selector)
    elements.forEach(el => el.remove())
  })
  
  // Extract main content area
  const contentSelectors = ['main', 'article', '[class*="job"]', '[class*="description"]', '[id*="job"]', 'body']
  for (const selector of contentSelectors) {
    const content = doc.querySelector(selector)
    if (content && content.textContent && content.textContent.length > 200) {
      return content.textContent
        .replace(/\s+/g, ' ')
        .replace(/\n+/g, '\n')
        .trim()
        .substring(0, 5000) // Limit to 5000 chars for AI
    }
  }
  
  return doc.body?.textContent?.replace(/\s+/g, ' ').trim().substring(0, 5000) || html
}

// Use Lovable AI to generate student-focused description and tech stack
async function enrichWithAI(html: string, company: string, roleTitle: string) {
  if (!LOVABLE_API_KEY) {
    console.error('LOVABLE_API_KEY not configured')
    return {
      summary: 'Enrichment unavailable - API key not configured',
      tech_stack: [],
      confidence: 0
    }
  }
  
  const cleanedContent = cleanHtmlForAI(html)
  
  const prompt = `You are an internship description editor for students. Transform this job posting into a concise, student-focused format.

Company: ${company}
Role: ${roleTitle}

Job Posting Content:
${cleanedContent}

CRITICAL FORMATTING RULES:
1. Return summary as EXACTLY 3-4 lines (newline-separated with \\n)
2. Each line must be ≤100 characters
3. Each line MUST include a concrete "build / do / learn" action verb
4. NO marketing fluff (avoid: fast-paced, world-class, dynamic, innovative, cutting-edge, exciting)
5. Total summary length: 180-350 characters

TECH STACK RULES:
1. Extract 3-12 REAL TECHNOLOGIES ONLY: languages, frameworks, DBs, cloud, tools
2. EXCLUDE roles/domains (product management, research, computer vision) unless paired with concrete tech (pytorch for ML)
3. EXCLUDE soft skills (communication, teamwork, leadership)
4. Use lowercase canonical forms: python, java, c++, typescript, javascript, react, nodejs, postgresql, aws, docker, kubernetes, git

OUTPUT FORMAT (must match exactly):
Description: [line 1 - what they'll BUILD (≤100 chars)]
[line 2 - what they'll DO/LEARN (≤100 chars)]
[line 3 - technical environment/impact (≤100 chars)]
Tech: {tag1, tag2, tag3, ...}

Example output:
Description: Build POS, mobile, and retail systems for 7-Eleven stores nationwide.
Work across full SDLC—design, development, testing, and production deployment.
Analyze system performance and write technical design documentation.
Tech: {c++, postgresql, angular, rest, nodejs, android}`

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.3, // Lower temperature for more consistent formatting
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Lovable AI error (${response.status}):`, errorText)
      
      if (response.status === 429) {
        return {
          summary: 'Rate limit exceeded - please try again later',
          tech_stack: [],
          confidence: 0
        }
      }
      
      if (response.status === 402) {
        return {
          summary: 'AI credits depleted - please add funds to continue enrichment',
          tech_stack: [],
          confidence: 0
        }
      }
      
      throw new Error(`AI API error: ${response.status}`)
    }

    const data = await response.json()
    const aiOutput = data.choices[0].message.content
    
    console.log('AI Output:', aiOutput.substring(0, 200))
    
    // Parse the AI output
    const descMatch = aiOutput.match(/Description:\s*(.+?)(?=\nTech:|$)/s)
    const techMatch = aiOutput.match(/Tech:\s*\{([^}]+)\}/)
    
    const summary = descMatch ? descMatch[1].trim() : 'Internship opportunity available'
    const techStackRaw = techMatch ? techMatch[1] : ''
    const tech_stack = techStackRaw
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(t => t.length > 0)
      .slice(0, 12)
    
    // Validate against canonical tech_tags
    const validatedTechStack = await validateTechStack(tech_stack)
    
    return {
      summary,
      tech_stack: validatedTechStack,
      confidence: (summary.length > 50 && validatedTechStack.length > 0) ? 90 : 50
    }
  } catch (error) {
    console.error('AI enrichment error:', error)
    return {
      summary: 'Unable to enrich job description - please try again',
      tech_stack: [],
      confidence: 0
    }
  }
}

// Validate tech stack against canonical tags
async function validateTechStack(techStack: string[]): Promise<string[]> {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    // Fetch all canonical tags
    const { data: canonicalTags, error } = await supabaseClient
      .from('tech_tags')
      .select('tag')
    
    if (error || !canonicalTags) {
      console.error('Failed to fetch canonical tags:', error)
      return techStack // Fallback to original if fetch fails
    }
    
    const validTags = new Set(canonicalTags.map(t => t.tag.toLowerCase()))
    
    // Filter to only canonical tags
    const validated = techStack.filter(tag => validTags.has(tag.toLowerCase()))
    
    // Log rejected tags
    const rejected = techStack.filter(tag => !validTags.has(tag.toLowerCase()))
    if (rejected.length > 0) {
      console.log('Rejected non-canonical tags:', rejected)
    }
    
    return validated
  } catch (error) {
    console.error('Tech stack validation error:', error)
    return techStack // Fallback to original if validation fails
  }
}
