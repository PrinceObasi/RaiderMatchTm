import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
  explanation: {
    contributions: {
      overlap: number
      gpa: number
      prevIntern: number
      projectDepth: number
    }
    missingSkills: string[]
  }
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

    // Use pg_trgm similarity matching for internship jobs with date filtering
    const { data: jobs, error: jobsError } = await supabase.rpc('match_internships', {
      student_skills: studentSkills,
      is_international: isInternational
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

        const hireScore = computeHireScore({
          skillOverlap,
          gpa: normalizedGPA,
          prevIntern,
          projectDepth
        })

        const explanation = {
          contributions: {
            overlap: Math.round(skillOverlap * 100),
            gpa: Math.round(normalizedGPA * 100),
            prevIntern: prevIntern ? 100 : 0,
            projectDepth: Math.round(projectDepth * 100)
          },
          missingSkills
        }

        return {
          id: job.id,
          title: job.title,
          company: job.company,
          city: job.city,
          description: job.description,
          skills: jobSkills,
          hireScore,
          apply_url: job.apply_url,
          explanation
        }
      })

      return new Response(
        JSON.stringify({ jobs: jobMatches }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Convert pg_trgm similarity and compute explainable hire score
    const jobMatches: JobMatch[] = jobs.map((job: any) => {
      const jobSkills = job.skills || []
      const skillOverlap = job.similarity || 0
      const normalizedGPA = normalizeGPA(studentData.gpa || 0)
      const prevIntern = studentData.has_prev_intern || false
      const projectDepth = studentData.project_depth || 0

      const missingSkills = jobSkills.filter(skill => 
        !studentSkills.some(studentSkill => 
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

      const explanation = {
        contributions: {
          overlap: Math.round(skillOverlap * 100),
          gpa: Math.round(normalizedGPA * 100),
          prevIntern: prevIntern ? 100 : 0,
          projectDepth: Math.round(projectDepth * 100)
        },
        missingSkills
      }

      return {
        id: job.id,
        title: job.title,
        company: job.company,
        city: job.city,
        description: job.description,
        skills: jobSkills,
        hireScore,
        apply_url: job.apply_url,
        explanation
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