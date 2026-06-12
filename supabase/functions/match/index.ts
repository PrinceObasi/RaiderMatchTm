import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Factors {
  overlap: number;        // 0-1
  gpa: number;            // 0-1
  prevIntern: boolean;
  projectDepth: number;   // 0-1
  missingSkills: string[];
  weightedScore?: number; // 0-1 overall weighted score
  gpaScore?: number;      // 0-1 GPA component score
  experienceScore?: number; // 0-1 experience component score
  recencyScore?: number;  // 0-1 recency component score
}

function buildExplanation(f: Factors) {
  const lines: string[] = [];

  // Enhanced explanations using weighted scoring components
  
  // 1. Overall Match Quality
  if (f.weightedScore !== undefined) {
    if (f.weightedScore >= 0.85) {
      lines.push('🎯 Excellent match! This role aligns perfectly with your profile.');
    } else if (f.weightedScore >= 0.7) {
      lines.push('✅ Strong match with good alignment across multiple factors.');
    } else if (f.weightedScore >= 0.5) {
      lines.push('📊 Moderate match - some areas align well, others need improvement.');
    } else {
      lines.push('⚠️ Lower match score - consider strengthening your profile for similar roles.');
    }
  }

  // 2. Skills Analysis (50% of score)
  if (f.overlap > 0.8) {
    lines.push('💪 Your résumé covers most required skills.');
  } else if (f.overlap > 0.5) {
    lines.push('📝 You match some key skills - highlight relevant experience more.');
  } else if (f.overlap > 0.2) {
    lines.push('🎯 Limited skill overlap - consider developing missing competencies.');
  } else {
    lines.push('📚 Few matching skills found - significant skill gap exists.');
  }

  // 3. Missing Skills Guidance
  if (f.missingSkills.length > 0) {
    const topMissing = f.missingSkills.slice(0, 3).join(', ');
    lines.push(`🔍 Consider learning: ${topMissing}`);
  }

  // 4. Academic Standing (20% of score)
  if (f.gpaScore !== undefined) {
    if (f.gpaScore >= 0.9) {
      lines.push('🏆 Exceptional GPA strengthens your candidacy.');
    } else if (f.gpaScore >= 0.7) {
      lines.push('📊 Solid academic performance supports your application.');
    } else {
      lines.push('📈 Focus on highlighting other strengths to offset GPA.');
    }
  }

  // 5. Experience Level (20% of score)
  if (f.experienceScore !== undefined) {
    if (f.experienceScore >= 0.9) {
      lines.push('⭐ Your experience level is ideal for this role.');
    } else if (f.experienceScore >= 0.7) {
      lines.push('✨ Good experience match - emphasize relevant projects.');
    } else {
      lines.push('🚀 Entry-level friendly role - great opportunity to grow.');
    }
  }

  // 6. Application Timing (10% of score)
  if (f.recencyScore !== undefined) {
    if (f.recencyScore >= 0.9) {
      lines.push('⚡ Recently posted - apply soon for best chances.');
    } else if (f.recencyScore >= 0.6) {
      lines.push('📅 Posted recently - still fresh opportunity.');
    } else {
      lines.push('⏰ Older posting - verify if still accepting applications.');
    }
  }

  return lines;
}

interface JobMatch {
  id: string
  title: string
  company: string
  city: string
  description: string
  skills: string[]
  hireScore: number
  apply_url: string
  explanationLines: string[]
}

function computeHireScore(factors: {
  skillOverlap: number
  gpa: number
  prevIntern: boolean
  projectDepth: number
}) {
  const score =
    0.40 * factors.skillOverlap +
    0.25 * factors.gpa +
    0.20 * (factors.prevIntern ? 1 : 0) +
    0.15 * factors.projectDepth;
  return Math.round(score * 100);
}

function normalizeGPA(gpa: number): number {
  if (!gpa || gpa < 2.0) return 0;
  if (gpa > 4.0) return 1;
  return (gpa - 2.0) / 2.0;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get student's profile data including new features
    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .select('skills, is_international, gpa, has_prev_intern, project_depth')
      .eq('user_id', user.id)
      .single()

    if (studentError || !studentData) {
      return new Response(
        JSON.stringify({ error: 'Student profile not found. Please upload a resume first.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const studentSkills = studentData.skills || []
    const isInternational = studentData.is_international || false
    
    if (studentSkills.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No skills found in profile. Please upload a resume first.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Use improved weighted matching algorithm  
    const { data: jobs, error: jobsError } = await supabase.rpc('match_internships_weighted', {
      student_skills: studentSkills,
      student_gpa: studentData.gpa || 0,
      student_year: studentData.graduation_year || 2025,
      has_prev_intern: studentData.has_prev_intern || false,
      is_international: isInternational,
      max_results: 10
    })

    if (jobsError) {
      console.error('Jobs query error:', jobsError)
      
      // Fallback to simple matching if RPC fails
      let jobQuery = supabase
        .from('jobs')
        .select('*')
        .ilike('title', '%intern%')
        .lte('opens_at', new Date().toISOString().split('T')[0])
        .or('closes_at.is.null,closes_at.gte.' + new Date().toISOString().split('T')[0])

      // Apply visa sponsorship filter for international students
      if (isInternational) {
        jobQuery = jobQuery.eq('sponsors_visa', true)
      }

      const { data: fallbackJobs, error: fallbackError } = await jobQuery.limit(10)

      if (fallbackError) {
        return new Response(
          JSON.stringify({ error: 'Failed to fetch job matches' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Calculate explainable score for fallback
      const jobMatches: JobMatch[] = fallbackJobs.map((job: any) => {
        const jobSkills = job.skills || []
        const overlap = studentSkills.filter(skill => 
          jobSkills.some((jobSkill: string) => 
            jobSkill.toLowerCase().includes(skill.toLowerCase()) ||
            skill.toLowerCase().includes(jobSkill.toLowerCase())
          )
        ).length
        
        const maxSkills = Math.max(studentSkills.length, jobSkills.length)
        const skillOverlap = maxSkills > 0 ? overlap / maxSkills : 0
        const normalizedGPA = normalizeGPA(studentData.gpa || 0)
        const prevIntern = studentData.has_prev_intern || false
        const projectDepth = studentData.project_depth || 0

        const missingSkills = jobSkills.filter(skill =>
          !studentSkills.some(studentSkill =>
            studentSkill.toLowerCase().includes(skill.toLowerCase()) ||
            skill.toLowerCase().includes(studentSkill.toLowerCase())
          )
        )

      const matchedSkills = jobSkills.filter(skill =>
        studentSkills.some(studentSkill =>
          studentSkill.toLowerCase().includes(skill.toLowerCase()) ||
          skill.toLowerCase().includes(studentSkill.toLowerCase())
        )
      )

      const hireScore = computeHireScore({
        skillOverlap,
        gpa: normalizedGPA,
        prevIntern,
        projectDepth
      })

      const explanationLines = buildExplanation({
        overlap: skillOverlap,
        gpa: normalizedGPA,
        prevIntern,
        projectDepth,
        missingSkills
      })

      return {
        id: job.id,
        title: job.title,
        company: job.company,
        company_logo: job.company_logo,
        city: job.city,
        description: job.description,
        summary_text: job.summary_text || null,
        skills: jobSkills,
        matched_skills: matchedSkills,
        missing_skills: missingSkills,
        hireScore,
        apply_url: job.apply_url,
        posted_date: job.posted_date,
        date_posted: job.date_posted || job.posted_date,
        job_type: job.job_type,
        salary_min: job.salary_min,
        salary_max: job.salary_max,
        salary_period: job.salary_period || null,
        explanationLines
      }
      })

      return new Response(
        JSON.stringify({ jobs: jobMatches }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Use the weighted score from the improved matching algorithm
    const jobMatches: JobMatch[] = jobs.map((job: any) => {
      const jobSkills = job.skills || []
      const weightedScore = job.weighted_score || 0
      const skillMatchScore = job.skill_match_score || 0
      const gpaScore = job.gpa_score || 0
      const experienceScore = job.experience_score || 0
      const recencyScore = job.recency_score || 0
      
      const normalizedGPA = normalizeGPA(studentData.gpa || 0)
      const prevIntern = studentData.has_prev_intern || false
      const projectDepth = studentData.project_depth || 0

      const missingSkills = jobSkills.filter(skill =>
        !studentSkills.some(studentSkill =>
          studentSkill.toLowerCase().includes(skill.toLowerCase()) ||
          skill.toLowerCase().includes(studentSkill.toLowerCase())
        )
      )

      const matchedSkills = jobSkills.filter(skill =>
        studentSkills.some(studentSkill =>
          studentSkill.toLowerCase().includes(skill.toLowerCase()) ||
          skill.toLowerCase().includes(studentSkill.toLowerCase())
        )
      )

    // Convert weighted score (0-1) to hire score (0-100)
    const hireScore = Math.round(weightedScore * 100)

    const explanationLines = buildExplanation({
      overlap: skillMatchScore,
      gpa: normalizedGPA,
      prevIntern,
      projectDepth,
      missingSkills,
      weightedScore,
      gpaScore,
      experienceScore,
      recencyScore
    })

    return {
      id: job.id,
      title: job.title,
      company: job.company,
      company_logo: job.company_logo,
      city: job.city,
      description: job.description,
      summary_text: job.summary_text || null,
      skills: jobSkills,
      matched_skills: matchedSkills,
      missing_skills: missingSkills,
      composite_score: hireScore,
      hireScore,
      apply_url: job.apply_url,
      posted_date: job.posted_date,
      date_posted: job.date_posted || job.posted_date,
      job_type: job.job_type,
      salary_min: job.salary_min,
      salary_max: job.salary_max,
      salary_period: job.salary_period || null,
      explanationLines
    }
    })

    return new Response(
      JSON.stringify({ jobs: jobMatches }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})