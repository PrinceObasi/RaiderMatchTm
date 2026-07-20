import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const DEFAULT_MATCH_LIMIT = 10

interface StudentProfileRow {
  is_international: boolean | null
}

interface InternshipDetailRow {
  id: string
  apply_url: string | null
  clearance_required: boolean | null
  description_text: string | null
  employment_type: string | null
  salary_period: string | null
  source: string | null
  us_citizen_required: boolean | null
}

interface WeightedMatchRow {
  application_link: string
  company: string
  composite_score: number
  date_posted: string
  deadline: string
  direct_link: string
  experience_score: number
  gpa_score: number
  id: string
  link_type: string
  location: string
  matched_count: number
  matched_tags: string[]
  missing_skills: string[]
  preference_score: number
  recency_score: number
  role_title: string
  salary_currency: string
  salary_max: number
  salary_min: number
  skill_overlap_ratio: number
  summary_text: string
  tech_stack: string[]
  total_required: number
  visa_sponsorship: string
  work_mode: string
}

type MatchDatabase = {
  public: {
    Tables: {
      internships: {
        Row: InternshipDetailRow
        Insert: Partial<InternshipDetailRow>
        Update: Partial<InternshipDetailRow>
        Relationships: []
      }
      students: {
        Row: StudentProfileRow
        Insert: Partial<StudentProfileRow>
        Update: Partial<StudentProfileRow>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      match_internships_weighted: {
        Args: { p_limit?: number; p_user_id: string }
        Returns: WeightedMatchRow[]
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

interface ExplanationFactors {
  experienceScore: number
  gpaScore: number
  ineligible: boolean
  missingSkills: string[]
  overlap: number
  recencyScore: number
  restrictionLabels: string[]
  weightedScore: number
}

interface MatchResponseJob {
  application_link: string | null
  apply_url: string | null
  city: string | null
  company: string
  company_logo: null
  composite_score: number
  date_posted: string | null
  deadline: string | null
  description: string | null
  direct_link: string | null
  experience_score: number
  explanationLines: string[]
  gpa_score: number
  hireScore: number
  id: string
  ineligible: boolean
  job_type: string | null
  link_type: string | null
  matched_count: number
  matched_skills: string[]
  missing_skills: string[]
  posted_date: string | null
  preference_score: number
  recency_score: number
  requires_clearance: string | null
  requires_us_citizenship: boolean
  salary_currency: string | null
  salary_max: number | null
  salary_min: number | null
  salary_period: string | null
  skill_overlap_ratio: number
  skills: string[]
  source: string | null
  summary_text: string | null
  title: string
  total_required: number
  visa_sponsorship: string | null
  work_mode: string | null
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}

function toUnitScore(value: number): number {
  if (!Number.isFinite(value)) return 0
  const normalized = value > 1 ? value / 100 : value
  return clamp(normalized, 0, 1)
}

function toPercentScore(value: number): number {
  return Math.round(toUnitScore(value) * 100)
}

function cleanStringArray(values: string[] | null | undefined): string[] {
  if (!values) return []

  const seen = new Set<string>()
  const result: string[] = []

  for (const value of values) {
    const trimmed = value.trim()
    const key = trimmed.toLocaleLowerCase()
    if (!trimmed || seen.has(key)) continue
    seen.add(key)
    result.push(trimmed)
  }

  return result
}

function firstNonEmpty(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    const trimmed = value?.trim()
    if (trimmed) return trimmed
  }
  return null
}

function buildExplanation(factors: ExplanationFactors): string[] {
  const lines: string[] = []

  if (factors.ineligible) {
    const restrictions = factors.restrictionLabels.join(' and ')
    lines.push(
      restrictions
        ? `⛔ Eligibility review required: this role lists ${restrictions}.`
        : '⛔ Eligibility review required for this role.',
    )
  }

  if (factors.weightedScore >= 0.85) {
    lines.push('🎯 Excellent match! This role aligns strongly with your profile.')
  } else if (factors.weightedScore >= 0.7) {
    lines.push('✅ Strong match with good alignment across multiple factors.')
  } else if (factors.weightedScore >= 0.5) {
    lines.push('📊 Moderate match - some areas align well, others need improvement.')
  } else {
    lines.push('⚠️ Lower match score - consider strengthening your profile for similar roles.')
  }

  if (factors.overlap > 0.8) {
    lines.push('💪 Your résumé covers most required skills.')
  } else if (factors.overlap > 0.5) {
    lines.push('📝 You match some key skills - highlight relevant experience more.')
  } else if (factors.overlap > 0.2) {
    lines.push('🎯 Limited skill overlap - consider developing missing competencies.')
  } else {
    lines.push('📚 Few matching skills found - significant skill gap exists.')
  }

  if (factors.missingSkills.length > 0) {
    lines.push(`🔍 Consider learning: ${factors.missingSkills.slice(0, 3).join(', ')}`)
  }

  if (factors.gpaScore >= 0.9) {
    lines.push('🏆 Exceptional GPA strengthens your candidacy.')
  } else if (factors.gpaScore >= 0.7) {
    lines.push('📊 Solid academic performance supports your application.')
  } else {
    lines.push('📈 Focus on highlighting other strengths to offset GPA.')
  }

  if (factors.experienceScore >= 0.9) {
    lines.push('⭐ Your experience level is ideal for this role.')
  } else if (factors.experienceScore >= 0.7) {
    lines.push('✨ Good experience match - emphasize relevant projects.')
  } else {
    lines.push('🚀 Entry-level friendly role - great opportunity to grow.')
  }

  if (factors.recencyScore >= 0.9) {
    lines.push('⚡ Recently posted - apply soon for best chances.')
  } else if (factors.recencyScore >= 0.6) {
    lines.push('📅 Posted recently - still a fresh opportunity.')
  } else {
    lines.push('⏰ Older posting - verify that it is still accepting applications.')
  }

  return lines
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const authorization = req.headers.get('Authorization')
  if (!authorization) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase function environment variables')
    return jsonResponse({ error: 'Service configuration error' }, 500)
  }

  try {
    const supabase = createClient<MatchDatabase>(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authorization } },
    })

    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData.user) {
      return jsonResponse({ error: 'Unauthorized' }, 401)
    }

    const userId = userData.user.id
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('is_international')
      .eq('user_id', userId)
      .single()

    if (studentError || !student) {
      console.error('Student profile query error:', studentError)
      return jsonResponse(
        { error: 'Student profile not found. Please upload a resume first.' },
        404,
      )
    }

    const { data: weightedMatches, error: matchError } = await supabase.rpc(
      'match_internships_weighted',
      { p_user_id: userId, p_limit: DEFAULT_MATCH_LIMIT },
    )

    if (matchError) {
      console.error('Weighted matching RPC error:', matchError)
      return jsonResponse({ error: 'Failed to fetch job matches' }, 500)
    }

    if (!weightedMatches || weightedMatches.length === 0) {
      return jsonResponse({ jobs: [] })
    }

    const matchedIds = [...new Set(weightedMatches.map((match: WeightedMatchRow) => match.id))]
    const { data: internshipDetails, error: detailsError } = await supabase
      .from('internships')
      .select(
        'id, apply_url, clearance_required, description_text, employment_type, salary_period, source, us_citizen_required',
      )
      .in('id', matchedIds)

    if (detailsError) {
      console.error('Internship eligibility query error:', detailsError)
      return jsonResponse({ error: 'Failed to fetch internship eligibility' }, 500)
    }

    const detailsById = new Map<string, InternshipDetailRow>(
      (internshipDetails ?? []).map((detail) => [detail.id, detail]),
    )
    const isInternational = student.is_international === true

    const jobs: MatchResponseJob[] = weightedMatches.map((match: WeightedMatchRow) => {
      const detail = detailsById.get(match.id)
      const requiresUsCitizenship = detail?.us_citizen_required === true
      const clearanceRequired = detail?.clearance_required === true
      const ineligible = isInternational && (requiresUsCitizenship || clearanceRequired)
      const requiresClearance = clearanceRequired ? 'Required' : null
      const restrictionLabels = [
        requiresUsCitizenship ? 'U.S. citizenship' : null,
        clearanceRequired ? 'security clearance' : null,
      ].filter((label): label is string => label !== null)

      const skills = cleanStringArray(match.tech_stack)
      const matchedSkills = cleanStringArray(match.matched_tags)
      const missingSkills = cleanStringArray(match.missing_skills)
      const skillOverlapRatio = toUnitScore(match.skill_overlap_ratio)
      const hireScore = toPercentScore(match.composite_score)
      const explanationLines = buildExplanation({
        experienceScore: toUnitScore(match.experience_score),
        gpaScore: toUnitScore(match.gpa_score),
        ineligible,
        missingSkills,
        overlap: skillOverlapRatio,
        recencyScore: toUnitScore(match.recency_score),
        restrictionLabels,
        weightedScore: hireScore / 100,
      })

      const applicationLink = firstNonEmpty(match.application_link)
      const directLink = firstNonEmpty(match.direct_link)

      return {
        application_link: applicationLink,
        apply_url: firstNonEmpty(detail?.apply_url, applicationLink, directLink),
        city: firstNonEmpty(match.location),
        company: match.company,
        company_logo: null,
        composite_score: hireScore,
        date_posted: firstNonEmpty(match.date_posted),
        deadline: firstNonEmpty(match.deadline),
        description: firstNonEmpty(detail?.description_text, match.summary_text),
        direct_link: directLink,
        experience_score: match.experience_score,
        explanationLines,
        gpa_score: match.gpa_score,
        hireScore,
        id: match.id,
        ineligible,
        job_type: firstNonEmpty(detail?.employment_type),
        link_type: firstNonEmpty(match.link_type),
        matched_count: match.matched_count,
        matched_skills: matchedSkills,
        missing_skills: missingSkills,
        posted_date: firstNonEmpty(match.date_posted),
        preference_score: match.preference_score,
        recency_score: match.recency_score,
        requires_clearance: requiresClearance,
        requires_us_citizenship: requiresUsCitizenship,
        salary_currency: firstNonEmpty(match.salary_currency),
        salary_max: Number.isFinite(match.salary_max) ? match.salary_max : null,
        salary_min: Number.isFinite(match.salary_min) ? match.salary_min : null,
        salary_period: firstNonEmpty(detail?.salary_period),
        skill_overlap_ratio: skillOverlapRatio,
        skills,
        source: firstNonEmpty(detail?.source),
        summary_text: firstNonEmpty(match.summary_text),
        title: match.role_title,
        total_required: match.total_required,
        visa_sponsorship: firstNonEmpty(match.visa_sponsorship),
        work_mode: firstNonEmpty(match.work_mode),
      }
    })

    return jsonResponse({ jobs })
  } catch (error: unknown) {
    console.error('Unexpected matching error:', error)
    return jsonResponse({ error: 'Internal server error' }, 500)
  }
})
