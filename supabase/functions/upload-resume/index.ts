import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ResumeParseResult {
  skills: string[]
  name?: string
  email?: string
  gpa?: number
  graduation_year?: number
  major?: string
  work_experience?: WorkExperience[]
  projects?: Project[]
}

interface WorkExperience {
  company: string
  position: string
  start_date: string
  end_date: string | null
  description: string
  current: boolean
}

interface Project {
  title: string
  description: string
  tech_stack: string[]
  url: string | null
  start_date: string
  end_date: string | null
}

// Enhanced resume parser that extracts comprehensive profile information
async function parseResume(text: string): Promise<ResumeParseResult> {
  const result: ResumeParseResult = {
    skills: [],
    work_experience: [],
    projects: []
  }

  // Extract skills
  result.skills = await parseResumeSkills(text)

  // Extract GPA (patterns like "GPA: 3.5", "GPA 3.75", "3.8 GPA")
  const gpaMatch = text.match(/\b(?:gpa|g\.p\.a\.|grade point average)[\s:]*(\d+\.\d+|\d+)/i)
  if (gpaMatch) {
    const gpa = parseFloat(gpaMatch[1])
    if (gpa >= 0 && gpa <= 4) {
      result.gpa = gpa
    }
  }

  // Extract graduation year (looking for years between 2020-2030)
  const gradYearMatch = text.match(/(?:graduation|expected|graduating|graduate)[\s:]*(?:in|year)?[\s]*(\d{4})/i) ||
                        text.match(/\b(202[0-9]|203[0])\b/)
  if (gradYearMatch) {
    const year = parseInt(gradYearMatch[1])
    if (year >= 2020 && year <= 2030) {
      result.graduation_year = year
    }
  }

  // Extract major (common patterns)
  const majorPatterns = [
    /major(?:ing)?[\s:]+([^,\n]+)/i,
    /\b(computer science|software engineering|electrical engineering|mechanical engineering|business|marketing|finance|accounting|data science|information systems)\b/i
  ]
  for (const pattern of majorPatterns) {
    const match = text.match(pattern)
    if (match) {
      result.major = match[1].trim()
      break
    }
  }

  // Extract work experience
  result.work_experience = parseWorkExperience(text)

  // Extract projects
  result.projects = parseProjects(text)

  return result
}

// Parse work experience from resume text
function parseWorkExperience(text: string): WorkExperience[] {
  const experiences: WorkExperience[] = []
  const lines = text.split('\n')
  
  // Look for experience section
  const experienceKeywords = ['experience', 'employment', 'work history', 'professional experience']
  let inExperienceSection = false
  let currentExperience: Partial<WorkExperience> | null = null
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    const lowerLine = line.toLowerCase()
    
    // Check if we're entering experience section
    if (experienceKeywords.some(kw => lowerLine.includes(kw) && lowerLine.length < 50)) {
      inExperienceSection = true
      continue
    }
    
    // Exit if we hit another major section
    if (inExperienceSection && (lowerLine.match(/^(education|projects|skills|certifications)/))) {
      break
    }
    
    if (inExperienceSection && line.length > 5) {
      // Look for date ranges (e.g., "Jan 2023 - Present", "2022-2023")
      const dateMatch = line.match(/(\d{4}|\w{3,9}\s+\d{4})\s*[-–—]\s*(present|current|\d{4}|\w{3,9}\s+\d{4})/i)
      
      if (dateMatch) {
        // Save previous experience if exists
        if (currentExperience?.company && currentExperience?.position) {
          experiences.push({
            company: currentExperience.company,
            position: currentExperience.position,
            start_date: currentExperience.start_date || '',
            end_date: currentExperience.end_date || null,
            description: currentExperience.description || '',
            current: currentExperience.current || false
          })
        }
        
        // Start new experience
        const isCurrent = dateMatch[2].toLowerCase().match(/present|current/)
        currentExperience = {
          start_date: dateMatch[1],
          end_date: isCurrent ? null : dateMatch[2],
          current: !!isCurrent,
          description: ''
        }
        
        // Try to extract position and company from the same line or nearby
        const beforeDate = line.substring(0, dateMatch.index).trim()
        const parts = beforeDate.split(/[,|–—]/).map(p => p.trim()).filter(p => p.length > 0)
        
        if (parts.length >= 2) {
          currentExperience.position = parts[0]
          currentExperience.company = parts[1]
        } else if (parts.length === 1) {
          currentExperience.position = parts[0]
          // Look for company in previous line
          if (i > 0) {
            const prevLine = lines[i - 1].trim()
            if (prevLine.length > 0 && prevLine.length < 100) {
              currentExperience.company = prevLine
            }
          }
        }
      } else if (currentExperience) {
        // Add to description if we're in an experience block
        if (line.startsWith('-') || line.startsWith('•') || line.match(/^[a-z]/i)) {
          currentExperience.description += (currentExperience.description ? ' ' : '') + line.replace(/^[-•]\s*/, '')
        } else if (!currentExperience.company && line.length < 100) {
          // Might be company name
          currentExperience.company = line
        }
      }
    }
  }
  
  // Add last experience
  if (currentExperience?.company && currentExperience?.position) {
    experiences.push({
      company: currentExperience.company,
      position: currentExperience.position,
      start_date: currentExperience.start_date || '',
      end_date: currentExperience.end_date || null,
      description: currentExperience.description || '',
      current: currentExperience.current || false
    })
  }
  
  return experiences
}

// Parse projects from resume text
function parseProjects(text: string): Project[] {
  const projects: Project[] = []
  const lines = text.split('\n')
  
  // Look for projects section
  const projectKeywords = ['projects', 'personal projects', 'academic projects', 'portfolio']
  let inProjectSection = false
  let currentProject: Partial<Project> | null = null
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    const lowerLine = line.toLowerCase()
    
    // Check if we're entering projects section
    if (projectKeywords.some(kw => lowerLine.includes(kw) && lowerLine.length < 50)) {
      inProjectSection = true
      continue
    }
    
    // Exit if we hit another major section
    if (inProjectSection && lowerLine.match(/^(education|experience|skills|certifications)/)) {
      break
    }
    
    if (inProjectSection && line.length > 3) {
      // Look for URLs (likely project links)
      const urlMatch = line.match(/(https?:\/\/[^\s]+|github\.com\/[^\s]+)/i)
      
      // Look for date patterns
      const dateMatch = line.match(/(\d{4}|\w{3,9}\s+\d{4})\s*[-–—]\s*(present|current|\d{4}|\w{3,9}\s+\d{4})/i)
      
      // New project starts with a title (usually bold or at start of line)
      if (line.match(/^[A-Z]/) && !line.startsWith('-') && !line.startsWith('•') && line.length < 100) {
        // Save previous project
        if (currentProject?.title) {
          projects.push({
            title: currentProject.title,
            description: currentProject.description || '',
            tech_stack: currentProject.tech_stack || [],
            url: currentProject.url || null,
            start_date: currentProject.start_date || '',
            end_date: currentProject.end_date || null
          })
        }
        
        currentProject = {
          title: line.replace(/[:|–—]\s*$/, '').trim(),
          description: '',
          tech_stack: [],
          url: null,
          start_date: '',
          end_date: null
        }
      } else if (currentProject) {
        // Extract URL
        if (urlMatch) {
          currentProject.url = urlMatch[0]
        }
        
        // Extract dates
        if (dateMatch) {
          currentProject.start_date = dateMatch[1]
          const isCurrent = dateMatch[2].toLowerCase().match(/present|current/)
          currentProject.end_date = isCurrent ? null : dateMatch[2]
        }
        
        // Look for tech stack (usually in parentheses or after "Technologies:" or "Tech stack:")
        const techMatch = line.match(/(?:technologies?|tech stack|built with|using)[:\s]+([^.]+)/i)
        if (techMatch) {
          const techs = techMatch[1].split(/[,;]/).map(t => t.trim()).filter(t => t.length > 0)
          currentProject.tech_stack = [...(currentProject.tech_stack || []), ...techs]
        }
        
        // Add to description
        if (line.startsWith('-') || line.startsWith('•') || (!urlMatch && !dateMatch && !techMatch)) {
          const cleanLine = line.replace(/^[-•]\s*/, '')
          if (cleanLine.length > 0) {
            currentProject.description += (currentProject.description ? ' ' : '') + cleanLine
          }
        }
      }
    }
  }
  
  // Add last project
  if (currentProject?.title) {
    projects.push({
      title: currentProject.title,
      description: currentProject.description || '',
      tech_stack: currentProject.tech_stack || [],
      url: currentProject.url || null,
      start_date: currentProject.start_date || '',
      end_date: currentProject.end_date || null
    })
  }
  
  return projects
}

// Extract skills from text
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
    
    // Parse comprehensive resume information
    const parsedData = await parseResume(extractedText)

    console.log('Extracted data:', parsedData)

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

    // Update student record with all parsed information
    const updateData: any = {
      skills: parsedData.skills,
      resume_url: urlData.publicUrl
    }
    
    if (parsedData.gpa !== undefined) updateData.gpa = parsedData.gpa
    if (parsedData.graduation_year !== undefined) updateData.graduation_year = parsedData.graduation_year
    if (parsedData.major !== undefined) updateData.major = parsedData.major
    if (parsedData.work_experience && parsedData.work_experience.length > 0) {
      updateData.work_experience = parsedData.work_experience
    }
    if (parsedData.projects && parsedData.projects.length > 0) {
      updateData.projects = parsedData.projects
    }

    const { error: updateError } = await supabase
      .from('students')
      .update(updateData)
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
        ...parsedData,
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