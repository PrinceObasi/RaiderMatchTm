import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const CANONICAL_TAGS = new Set([
  'python', 'java', 'c', 'c++', 'c#', 'go', 'rust', 'javascript', 'typescript',
  'sql', 'postgresql', 'mysql', 'mongodb', 'react', 'node.js', 'spring', 'dotnet',
  'aws', 'gcp', 'azure', 'docker', 'kubernetes', 'linux', 'bash', 'git',
  'spark', 'hadoop', 'pytorch', 'tensorflow', 'scikit-learn', 'pandas', 'numpy',
  'airflow', 'snowflake', 'redis', 'elasticsearch', 'kafka', 'jenkins', 'terraform',
  'graphql', 'vue', 'angular', 'django', 'flask', 'fastapi', 'express', 'nextjs',
  'tailwind', 'sass', 'webpack', 'vite', 'jest', 'cypress', 'selenium'
])

const BUILD_VERBS = /\b(build|design|code|develop|test|analy[sz]e|prototype|deploy|present|optimi[sz]e|collaborate|visuali[sz]e|support|maintain|create|implement|deliver|work|contribute|participate|assist|gain|learn)\b/i

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { targetCount = 225 } = await req.json().catch(() => ({}))

    console.log(`Curating to top ${targetCount} internships`)

    // Fetch all active internships
    const { data: internships, error: fetchError } = await supabaseClient
      .from('internships')
      .select('id, company, role_title, location, summary_text, tech_stack, application_link, link_valid, created_at')
      .eq('is_active', true)

    if (fetchError) {
      console.error('Fetch error:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch internships' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Analyzing ${internships?.length || 0} active internships`)

    // Score each internship
    const scored = (internships || []).map(internship => {
      let score = 0
      const reasons: string[] = []

      // Must have valid application link
      if (!internship.application_link || internship.link_valid === false) {
        return { ...internship, score: -1, reasons: ['Invalid or missing application link'] }
      }
      score += 20
      reasons.push('Valid link')

      // Summary quality (0-40 points)
      if (internship.summary_text) {
        const summary = internship.summary_text.trim()
        const sentences = summary.split(/[.!?]+/).filter(s => s.trim().length > 0)
        
        if (summary.length >= 100 && summary.length <= 320) {
          score += 15
          reasons.push('Good length')
        }
        
        if (sentences.length >= 2 && sentences.length <= 3) {
          score += 15
          reasons.push('2-3 sentences')
        }
        
        if (BUILD_VERBS.test(summary)) {
          score += 10
          reasons.push('Action verbs')
        }
      } else {
        reasons.push('Missing summary')
      }

      // Location quality (0-15 points)
      if (internship.location) {
        const loc = internship.location.trim()
        const multiLocationPattern = /[;/|]|( and )|( or )/i
        const commaCount = (loc.match(/,/g) || []).length
        
        if (!multiLocationPattern.test(loc) && commaCount <= 2) {
          score += 15
          reasons.push('Single location')
        } else {
          reasons.push('Multiple locations')
        }
      } else {
        reasons.push('Missing location')
      }

      // Tech stack quality (0-25 points)
      if (internship.tech_stack && Array.isArray(internship.tech_stack)) {
        const stack = internship.tech_stack
        const validTags = stack.filter(tag => 
          CANONICAL_TAGS.has(tag.toLowerCase()) && tag === tag.toLowerCase()
        )
        
        if (stack.length >= 6 && stack.length <= 10) {
          score += 10
          reasons.push('Stack size 6-10')
        }
        
        if (validTags.length === stack.length && stack.length >= 6) {
          score += 15
          reasons.push('All canonical tags')
        } else if (validTags.length > 0) {
          reasons.push(`${validTags.length}/${stack.length} canonical`)
        }
      } else {
        reasons.push('Missing tech stack')
      }

      return {
        ...internship,
        score,
        reasons
      }
    })

    // Filter out invalid (-1 score) and sort by score
    const valid = scored.filter(s => s.score >= 0).sort((a, b) => b.score - a.score)
    const toKeep = valid.slice(0, targetCount)
    const toArchive = valid.slice(targetCount)

    console.log(`Keeping top ${toKeep.length}, archiving ${toArchive.length}`)

    // Archive the lower-quality ones
    if (toArchive.length > 0) {
      const archiveIds = toArchive.map(i => i.id)
      const { error: archiveError } = await supabaseClient
        .from('internships')
        .update({
          is_active: false,
          archived_at: new Date().toISOString(),
          needs_review: true,
          review_reason: ['curated_out']
        })
        .in('id', archiveIds)

      if (archiveError) {
        console.error('Archive error:', archiveError)
        return new Response(
          JSON.stringify({ error: 'Failed to archive internships' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Return summary with score distribution
    const scoreDistribution = {
      '80-100': toKeep.filter(i => i.score >= 80).length,
      '60-79': toKeep.filter(i => i.score >= 60 && i.score < 80).length,
      '40-59': toKeep.filter(i => i.score >= 40 && i.score < 60).length,
      '0-39': toKeep.filter(i => i.score < 40).length,
    }

    return new Response(
      JSON.stringify({
        success: true,
        kept: toKeep.length,
        archived: toArchive.length,
        scoreDistribution,
        topScores: toKeep.slice(0, 10).map(i => ({
          company: i.company,
          role: i.role_title,
          score: i.score,
          reasons: i.reasons
        })),
        bottomScores: toKeep.slice(-5).map(i => ({
          company: i.company,
          role: i.role_title,
          score: i.score,
          reasons: i.reasons
        }))
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Curation error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
