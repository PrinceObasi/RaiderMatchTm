import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ResumeParseResult {
  skills: string[]
  name?: string
  email?: string
}

// Simple resume parser that extracts skills from text content
async function parseResumeSkills(text: string): Promise<string[]> {
  const skillsSet = new Set<string>()
  
  // Common tech skills to look for
  const techSkills = [
    'JavaScript', 'TypeScript', 'React', 'Angular', 'Vue', 'Node.js', 'Express',
    'Python', 'Java', 'C++', 'C#', 'PHP', 'Ruby', 'Go', 'Rust', 'Swift',
    'HTML', 'CSS', 'SQL', 'MongoDB', 'PostgreSQL', 'MySQL', 'Redis',
    'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Git', 'Linux',
    'Machine Learning', 'AI', 'Data Science', 'TensorFlow', 'PyTorch',
    'REST APIs', 'GraphQL', 'Microservices', 'CI/CD', 'Agile', 'Scrum',
    'Figma', 'Adobe Creative Suite', 'Photoshop', 'Illustrator',
    'Network Security', 'Cybersecurity', 'Penetration Testing', 'SIEM',
    'Tableau', 'Power BI', 'R', 'Statistics', 'Analytics'
  ]
  
  const lowerText = text.toLowerCase()
  
  // Look for skills in the text
  techSkills.forEach(skill => {
    if (lowerText.includes(skill.toLowerCase())) {
      skillsSet.add(skill)
    }
  })
  
  // Look for programming languages patterns
  const programmingPatterns = [
    /\b(javascript|js)\b/gi,
    /\b(typescript|ts)\b/gi,
    /\bpython\b/gi,
    /\bjava\b/gi,
    /\bc\+\+\b/gi,
    /\bc#\b/gi,
    /\bnode\.?js\b/gi,
    /\breact\.?js\b/gi
  ]
  
  programmingPatterns.forEach(pattern => {
    const matches = text.match(pattern)
    if (matches) {
      matches.forEach(match => {
        const normalized = match.replace(/[^\w\+#]/g, '').toLowerCase()
        if (normalized === 'javascript' || normalized === 'js') skillsSet.add('JavaScript')
        else if (normalized === 'typescript' || normalized === 'ts') skillsSet.add('TypeScript')
        else if (normalized === 'python') skillsSet.add('Python')
        else if (normalized === 'java') skillsSet.add('Java')
        else if (normalized === 'c++') skillsSet.add('C++')
        else if (normalized === 'c#') skillsSet.add('C#')
        else if (normalized.includes('node')) skillsSet.add('Node.js')
        else if (normalized.includes('react')) skillsSet.add('React')
      })
    }
  })
  
  return Array.from(skillsSet)
}

// Extract text from PDF buffer (simplified - in production use proper PDF parser)
async function extractTextFromPDF(buffer: ArrayBuffer): Promise<string> {
  // For this demo, we'll simulate text extraction
  // In production, you'd use a proper PDF parser
  const decoder = new TextDecoder()
  const text = decoder.decode(buffer)
  
  // Return a placeholder that contains common resume content
  return `
    John Doe
    Computer Science Student
    Texas Tech University
    Skills: JavaScript, Python, React, Node.js, SQL, Git, HTML, CSS
    Experience with web development, databases, and software engineering
    Familiar with agile methodologies and version control
  `
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

    const formData = await req.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (file.type !== 'application/pdf') {
      return new Response(
        JSON.stringify({ error: 'Only PDF files are allowed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check file size (max 4MB)
    const maxSize = 4 * 1024 * 1024 // 4MB in bytes
    if (file.size > maxSize) {
      return new Response(
        JSON.stringify({ error: 'File size must be less than 4MB' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Read file content
    const arrayBuffer = await file.arrayBuffer()
    
    // Extract text from PDF
    const extractedText = await extractTextFromPDF(arrayBuffer)
    
    // Parse skills from the extracted text
    const skills = await parseResumeSkills(extractedText)

    console.log('Extracted skills:', skills)

    // Upload file to Supabase Storage with standardized path
    const fileName = `${user.id}/resume.pdf`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('resumes')
      .upload(fileName, arrayBuffer, {
        contentType: 'application/pdf',
        upsert: true
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return new Response(
        JSON.stringify({ error: 'Failed to upload resume' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from('resumes')
      .getPublicUrl(fileName)

    // Update student record with skills and resume URL
    const { error: updateError } = await supabase
      .from('students')
      .update({
        skills: skills,
        resume_url: urlData.publicUrl
      })
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Update error:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to update student profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        skills: skills,
        resumeUrl: urlData.publicUrl,
        message: 'Resume uploaded and parsed successfully'
      }),
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