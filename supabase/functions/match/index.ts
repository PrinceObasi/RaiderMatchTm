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
}

function toExplanation(job: { overlap: number; missing_skills?: string[] }) {
  const lines: string[] = [];
  
  if (job.overlap >= 0.75) {
    lines.push('Your skills overlap strongly with this role.');
  } else if (job.overlap >= 0.4) {
    lines.push('You match some of the core skills.');
  } else {
    lines.push('Few listed skills appear in your résumé.');
  }

  if (job.missing_skills?.length) {
    lines.push(`Boost tip: add or highlight ${job.missing_skills.slice(0, 3).join(', ')}.`);
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
  apply_url: string
  overlap: number
  missing_skills: string[]
  explanationLines: string[]
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
      .select('id, skills, is_international, gpa, has_prev_intern, project_depth')
      .eq('user_id', user.id)
      .single()

    if (studentError || !studentData) {
      return new Response(
        JSON.stringify({ error: 'Student profile not found. Please upload a resume first.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const studentSkills = studentData.skills || []
    
    if (studentSkills.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No skills found in profile. Please upload a resume first.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Use the new working match_jobs function with coaching data
    const { data: jobs, error: jobsError } = await supabase.rpc('match_jobs', {
      p_student_id: studentData.id
    })

    if (jobsError) {
      console.error('Jobs query error:', jobsError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch job matches' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Convert the new match_jobs function results with coaching
    const jobMatches: JobMatch[] = jobs.map((job: any) => {
      const explanationLines = toExplanation({
        overlap: job.overlap || 0,
        missing_skills: job.missing_skills || []
      })

      return {
        id: job.id,
        title: job.title,
        company: job.company,
        city: job.city,
        description: job.description,
        skills: job.skills || [],
        apply_url: job.application_url,
        overlap: job.overlap || 0,
        missing_skills: job.missing_skills || [],
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