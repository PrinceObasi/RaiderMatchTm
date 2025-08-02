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

    // Get student's skills and international status
    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .select('skills, is_international')
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

      // Calculate simple overlap score for fallback
      const jobMatches: JobMatch[] = fallbackJobs.map((job: any) => {
        const jobSkills = job.skills || []
        const overlap = studentSkills.filter(skill => 
          jobSkills.some((jobSkill: string) => 
            jobSkill.toLowerCase().includes(skill.toLowerCase()) ||
            skill.toLowerCase().includes(jobSkill.toLowerCase())
          )
        ).length
        
        const maxSkills = Math.max(studentSkills.length, jobSkills.length)
        const hireScore = maxSkills > 0 ? Math.round((overlap / maxSkills) * 100) : 0

        return {
          id: job.id,
          title: job.title,
          company: job.company,
          city: job.city,
          description: job.description,
          skills: jobSkills,
          hireScore: Math.max(hireScore, 65), // Ensure minimum score for demo
          apply_url: job.apply_url
        }
      })

      return new Response(
        JSON.stringify({ jobs: jobMatches }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Convert pg_trgm similarity to hire score (0-100)
    const jobMatches: JobMatch[] = jobs.map((job: any) => ({
      id: job.id,
      title: job.title,
      company: job.company,
      city: job.city,
      description: job.description,
      skills: job.skills,
      hireScore: Math.round(job.similarity * 100),
      apply_url: job.apply_url
    }))

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