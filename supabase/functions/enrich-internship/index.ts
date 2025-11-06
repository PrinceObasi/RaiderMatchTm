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
    let httpStatus: number
    
    try {
      const response = await fetch(internship.application_link, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        signal: controller.signal
      })

      clearTimeout(timeoutId)
      httpStatus = response.status

      // Check if job is closed/dead (404, 410)
      if (httpStatus === 404 || httpStatus === 410) {
        console.log(`Job page returned ${httpStatus}, archiving as closed`)
        
        const { error: archiveError } = await supabaseClient
          .from('internships')
          .update({
            is_active: false,
            archived_at: new Date().toISOString(),
            enrichment_confidence: 0,
            notes: 'job_closed'
          })
          .eq('id', id)
        
        return new Response(
          JSON.stringify({ 
            ok: false, 
            archived: !archiveError,
            reason: `Job page returned ${httpStatus}` 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      html = await response.text()
      console.log(`Successfully fetched HTML, length: ${html.length}`)
      
      // Check for dead job phrases in HTML
      const deadJobPhrases = [
        'posting is no longer available',
        'this job is no longer available',
        'job not found',
        'this position has been filled',
        'position has been filled',
        'no longer accepting applications'
      ]
      
      const htmlLower = html.toLowerCase()
      const isDead = deadJobPhrases.some(phrase => htmlLower.includes(phrase))
      
      if (isDead) {
        console.log(`Job page contains "closed" phrase, archiving`)
        
        const { error: archiveError } = await supabaseClient
          .from('internships')
          .update({
            is_active: false,
            archived_at: new Date().toISOString(),
            enrichment_confidence: 0,
            notes: 'job_closed'
          })
          .eq('id', id)
        
        return new Response(
          JSON.stringify({ 
            ok: false, 
            archived: !archiveError,
            reason: 'Job posting no longer available' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
    } catch (fetchError) {
      clearTimeout(timeoutId)
      console.error('Fetch error:', fetchError)
      
      // Increment enrichment_attempts for fetch failures (AI/pipeline errors)
      const { data: current } = await supabaseClient
        .from('internships')
        .select('enrichment_attempts')
        .eq('id', id)
        .single()
      
      await supabaseClient
        .from('internships')
        .update({
          enrichment_confidence: 0,
          enrichment_attempts: (current?.enrichment_attempts ?? 0) + 1,
          notes: `ai_error: fetch failed - ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`
        })
        .eq('id', id)
      
      return new Response(
        JSON.stringify({ 
          ok: false, 
          archived: false,
          reason: 'Failed to fetch job page' 
        }),
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

    // Increment attempts if enrichment confidence is too low (AI failure, not dead job)
    if (enrichmentData.confidence === 0) {
      console.log(`Low confidence enrichment for ${id}, incrementing attempts`)
      
      const { data: current } = await supabaseClient
        .from('internships')
        .select('enrichment_attempts')
        .eq('id', id)
        .single()
      
      const { error: updateError } = await supabaseClient
        .from('internships')
        .update({
          enrichment_confidence: 0,
          enrichment_attempts: (current?.enrichment_attempts ?? 0) + 1,
          notes: `ai_error: ${enrichmentData.summary}`
        })
        .eq('id', id)
      
      if (updateError) {
        console.error('Update error:', updateError)
      }
      
      return new Response(
        JSON.stringify({ 
          ok: false, 
          archived: false,
          reason: enrichmentData.summary 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

INSTRUCTIONS:
1. Write a 2-3 sentence description focusing on what the intern will BUILD, LEARN, and DO (not corporate history or fluff)
2. Extract up to 12 key technologies as lowercase tags
3. Keep it action-oriented and specific

OUTPUT FORMAT (must match exactly):
Description: [your 2-3 sentences here]
Tech: {tag1, tag2, tag3, ...}

Example output:
Description: Join 7-Eleven's technology team to build POS, mobile, and retail systems. Work across the full SDLC—design, development, testing, and deployment. Analyze performance and produce clear design docs.
Tech: {c++, sqlserver, oracle, angular, jquery, bootstrap, rest, json, web api, wcf, nodejs, android}`

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
    
    return {
      summary,
      tech_stack,
      confidence: (summary.length > 50 && tech_stack.length > 0) ? 90 : 50
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
