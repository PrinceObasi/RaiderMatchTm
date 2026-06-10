import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1'

const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGIN') || '').split(',').map(o => o.trim()).filter(Boolean);

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || '';
  const isAllowed = ALLOWED_ORIGINS.length > 0 && ALLOWED_ORIGINS.includes(origin);
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : '',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  };
}

async function enrichWithAI(html: string) {
  // Clean HTML for AI processing
  const cleanText = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const prompt = `
Analyze this internship job posting and extract key information:

${cleanText}

INSTRUCTIONS:
1. Write a 2-3 sentence description focusing on what the intern will BUILD, LEARN, and DO (not corporate history or fluff)
2. Extract up to 12 key technologies as lowercase tags
3. Extract salary/pay range if mentioned (hourly rate like "$25-35/hr" or annual like "$60k-80k/yr"). If not mentioned, output "Not listed"
4. Extract application deadline if mentioned (as YYYY-MM-DD). If not mentioned, output "Not listed"
5. Extract work mode: Remote, Hybrid, or On-site. If not clear, output "Not listed"
6. Keep it action-oriented and specific

OUTPUT FORMAT (must match exactly):
Description: [your 2-3 sentences here]
Tech: {tag1, tag2, tag3, ...}
Salary: [salary range or "Not listed"]
Deadline: [YYYY-MM-DD or "Not listed"]
Work_Mode: [Remote|Hybrid|On-site|Not listed]

Example output:
Description: Join 7-Eleven's technology team to build POS, mobile, and retail systems. Work across the full SDLC—design, development, testing, and deployment.
Tech: {c++, sqlserver, oracle, angular, jquery, bootstrap, rest, json, web api, wcf, nodejs, android}
Salary: $25-35/hr
Deadline: Not listed
Work_Mode: On-site
`

  try {
    // For now, we'll use a simple mock AI response since we don't have OpenAI configured
    // In production, you would use OpenAI API or another LLM service
    const mockResponse = `Description: This internship offers hands-on experience in software development where you will build web applications, learn modern frameworks, and collaborate with senior developers. You'll contribute to real projects while gaining valuable industry experience and mentorship.
Tech: {react, javascript, typescript, node.js, sql, git, python}
Salary: Not listed
Deadline: Not listed
Work_Mode: Not listed`

    // Parse the AI response
    const descMatch = mockResponse.match(/Description:\s*(.+?)(?=\nTech:|$)/s)
    const techMatch = mockResponse.match(/Tech:\s*\{([^}]+)\}/)
    const salaryMatch = mockResponse.match(/Salary:\s*(.+?)(?=\n|$)/)
    const deadlineMatch = mockResponse.match(/Deadline:\s*(\d{4}-\d{2}-\d{2})/)
    const workModeMatch = mockResponse.match(/Work_Mode:\s*(Remote|Hybrid|On-site)/i)

    const summary = descMatch?.[1]?.trim() || 'No description available'
    const tech_stack = techMatch?.[1]?.split(',').map(t => t.trim()) || []

    // Parse salary into min/max
    let salary_min = null
    let salary_max = null
    let salary_period = null
    const salaryText = salaryMatch?.[1]?.trim() || ''
    if (salaryText && salaryText !== 'Not listed') {
      const hourlyMatch2 = salaryText.match(/\$(\d+)[\s\-–]+\$?(\d+)\s*\/?\s*h/i)
      const annualMatch2 = salaryText.match(/\$(\d+)k?[\s\-–]+\$?(\d+)k?\s*\/?\s*y/i)
      if (hourlyMatch2) {
        salary_min = parseInt(hourlyMatch2[1])
        salary_max = parseInt(hourlyMatch2[2])
        salary_period = 'hour'
      } else if (annualMatch2) {
        salary_min = parseInt(annualMatch2[1]) * (annualMatch2[1].includes('k') || parseInt(annualMatch2[1]) < 1000 ? 1000 : 1)
        salary_max = parseInt(annualMatch2[2]) * (annualMatch2[2].includes('k') || parseInt(annualMatch2[2]) < 1000 ? 1000 : 1)
        salary_period = 'year'
      }
    }
    const deadline = deadlineMatch?.[1] || null
    const work_mode = workModeMatch?.[1] || null

    return {
      summary,
      tech_stack,
      salary_min,
      salary_max,
      salary_period,
      deadline,
      work_mode,
      confidence: 0.8
    }
  } catch (error) {
    console.error('AI enrichment error:', error)
    return null
  }
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { id, html } = await req.json()

    if (!id || !html) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: id and html' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if job exists and hasn't been enriched recently
    const { data: existingJob, error: fetchError } = await supabaseClient
      .from('jobs')
      .select('id, enriched_at')
      .eq('id', id)
      .single()

    if (fetchError) {
      return new Response(
        JSON.stringify({ error: 'Job not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if already enriched within the last 24 hours
    if (existingJob.enriched_at) {
      const enrichedAt = new Date(existingJob.enriched_at)
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
      if (enrichedAt > dayAgo) {
        return new Response(
          JSON.stringify({ message: 'Job already enriched recently', skipped: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Enrich the job posting with AI
    const enrichmentData = await enrichWithAI(html)

    if (!enrichmentData) {
      return new Response(
        JSON.stringify({ error: 'Failed to enrich job posting' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update the job with enriched data
    const updatePayload: Record<string, any> = {
      jd_raw: html.substring(0, 50000),
      summary_text: enrichmentData.summary,
      tech_stack: enrichmentData.tech_stack,
      enrichment_confidence: enrichmentData.confidence,
      enrichment_attempts: 1,
      enriched_at: new Date().toISOString()
    }
    if (enrichmentData.salary_min != null) updatePayload.salary_min = enrichmentData.salary_min
    if (enrichmentData.salary_max != null) updatePayload.salary_max = enrichmentData.salary_max
    if (enrichmentData.salary_period) updatePayload.salary_period = enrichmentData.salary_period
    if (enrichmentData.deadline) updatePayload.deadline = enrichmentData.deadline
    if (enrichmentData.work_mode) updatePayload.work_mode = enrichmentData.work_mode

    const { error: updateError } = await supabaseClient
      .from('jobs')
      .update(updatePayload)
      .eq('id', id)

    if (updateError) {
      console.error('Database update error:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to update job' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        enriched: enrichmentData,
        message: 'Job enriched successfully'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})