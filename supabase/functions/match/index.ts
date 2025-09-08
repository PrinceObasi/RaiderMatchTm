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

function buildExplanation(f: Factors) {
  const lines: string[] = [];

  // 1. Skills
  if (f.overlap > 0.8) {
    lines.push('Your résumé covers most core skills listed.');
  } else if (f.overlap > 0.5) {
    lines.push('You match some key skills, but could highlight more.');
  } else {
    lines.push('Few required skills appear in your résumé.');
  }

  // 2. Missing-skill tip
  if (f.missingSkills.length) {
    lines.push(
      `Try adding: ${f.missingSkills.slice(0,3).join(', ')}.`
    );
  }

  // 3. GPA
  if (f.gpa >= 0.9) lines.push('Strong GPA boosts your score.');
  else if (f.gpa >= 0.7) lines.push('GPA is solid but not standout.');
  else lines.push('Low GPA lowers your match quality.');

  // 4. Internship history
  lines.push(
    f.prevIntern
      ? 'Prior internship experience is a big plus.'
      : 'No prior internship—companies may prefer proven interns.'
  );

  // 5. Project depth
  if (f.projectDepth >= 0.7)
    lines.push('GitHub projects show substantial real-world code.');
  else if (f.projectDepth >= 0.3)
    lines.push('Projects are OK—adding larger repos would help.');
  else
    lines.push('Lack of visible projects hurts your profile.');

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

    // Use the new working match_jobs function
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

    // Convert the new match_jobs function results and compute explainable hire score
    const jobMatches: JobMatch[] = jobs.map((job: any) => {
      const jobSkills = job.skills || []
      // Use the hire_score from the database function (0-100) and convert to 0-1 for explanation
      const skillOverlap = (job.hire_score || 0) / 100
      const normalizedGPA = normalizeGPA(studentData.gpa || 0)
      const prevIntern = studentData.has_prev_intern || false
      const projectDepth = studentData.project_depth || 0

      const missingSkills = jobSkills.filter(skill => 
        !studentSkills.some(studentSkill => 
          studentSkill.toLowerCase().includes(skill.toLowerCase()) ||
          skill.toLowerCase().includes(studentSkill.toLowerCase())
        )
      )

      // Use the computed hire score from the database function
      const hireScore = job.hire_score || 0

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
        city: job.city,
        description: job.description,
        skills: jobSkills,
        hireScore,
        apply_url: job.application_url,
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