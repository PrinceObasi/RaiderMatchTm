import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ParsedInternship {
  company: string
  role_title: string
  location: string
  application_link: string
  date_posted: string
  is_sponsorship_available: boolean
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Fetching SimplifyJobs internship list...')

    // Try the dev branch first (usually more up-to-date)
    let response = await fetch(
      'https://raw.githubusercontent.com/SimplifyJobs/Summer2025-Internships/dev/README.md'
    )
    
    // Fallback to main branch if dev doesn't exist
    if (!response.ok) {
      console.log('Dev branch not found, trying main branch...')
      response = await fetch(
        'https://raw.githubusercontent.com/SimplifyJobs/Summer2025-Internships/main/README.md'
      )
    }
    
    if (!response.ok) {
      throw new Error(`Failed to fetch SimplifyJobs data: ${response.status}`)
    }

    const markdown = await response.text()
    console.log(`Fetched ${markdown.length} characters of markdown`)
    
    // Parse the markdown table - look for the actual table structure
    const lines = markdown.split('\n')
    const internships: ParsedInternship[] = []
    
    let inTable = false
    let tableStarted = false
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      
      // Look for table header patterns
      if (line.includes('| Company') && line.includes('| Role') && line.includes('| Location')) {
        console.log('Found table header at line', i)
        inTable = true
        continue
      }
      
      // Skip separator line
      if (inTable && line.includes('|---') || line.includes('| ---')) {
        tableStarted = true
        continue
      }
      
      // Process table rows
      if (inTable && tableStarted && line.startsWith('|')) {
        // Split by | and clean up
        const cells = line.split('|')
          .map(cell => cell.trim())
          .filter(cell => cell !== '')
        
        if (cells.length >= 4) {
          // Parse company (first cell)
          let company = cells[0]
          // Remove arrows and special characters
          company = company.replace(/^↳\s*/, '')
            .replace(/\*\*/g, '')
            .replace(/🛂/g, '')
            .replace(/🇺🇸/g, '')
            .replace(/🔒/g, '')
            .trim()
          
          // Parse role (second cell)
          let role = cells[1].trim()
          
          // Parse location (third cell)  
          let location = cells[2].trim()
          
          // Parse link (fourth cell) - extract URL from markdown link
          let linkCell = cells[3]
          let applicationLink = ''
          
          // Check for closed/locked positions
          if (linkCell.includes('🔒') || linkCell.toLowerCase().includes('closed')) {
            continue // Skip closed positions
          }
          
          // Extract URL from markdown format [text](url)
          const urlMatch = linkCell.match(/\[([^\]]*)\]\(([^)]+)\)/)
          if (urlMatch && urlMatch[2]) {
            applicationLink = urlMatch[2].trim()
          } else if (linkCell.startsWith('http')) {
            applicationLink = linkCell.trim()
          }
          
          // Only add if we have all required fields and a valid link
          if (company && role && location && applicationLink && 
              !applicationLink.includes('🔒') && 
              applicationLink.startsWith('http')) {
            
            // Check for sponsorship indicators
            const sponsorshipAvailable = line.includes('🛂')
            
            internships.push({
              company,
              role_title: role,
              location,
              application_link: applicationLink,
              date_posted: new Date().toISOString().split('T')[0],
              is_sponsorship_available: sponsorshipAvailable
            })
          }
        }
      }
      
      // Stop if we hit the end of the table
      if (inTable && tableStarted && !line.startsWith('|')) {
        console.log('End of table reached at line', i)
        break
      }
    }

    console.log(`Parsed ${internships.length} total internships`)

    // If we didn't find any internships, there might be a format issue
    if (internships.length === 0) {
      // Try alternative parsing for different table format
      console.log('No internships found with primary parser, trying alternative format...')
      
      // Look for simpler pattern
      for (const line of lines) {
        if (line.includes('|') && !line.includes('---') && !line.includes('Company')) {
          const parts = line.split('|').map(p => p.trim()).filter(p => p)
          
          if (parts.length >= 4 && parts[3].includes('http')) {
            const urlMatch = parts[3].match(/https?:\/\/[^\s\)]+/)
            if (urlMatch) {
              internships.push({
                company: parts[0].replace(/[^\w\s\-\.&]/g, '').trim(),
                role_title: parts[1] || 'Software Engineering Intern',
                location: parts[2] || 'United States',
                application_link: urlMatch[0],
                date_posted: new Date().toISOString().split('T')[0],
                is_sponsorship_available: line.includes('🛂')
              })
            }
          }
        }
      }
    }

    console.log(`Final parsed count: ${internships.length} internships`)

    // Filter for CS-related roles
    const csKeywords = [
      'software', 'engineer', 'developer', 'programming', 'sde', 'swe',
      'data', 'machine learning', 'ml', 'ai', 'backend', 'frontend',
      'fullstack', 'full-stack', 'full stack', 'devops', 'cloud', 'security',
      'ios', 'android', 'mobile', 'web', 'platform', 'infrastructure',
      'systems', 'computer', 'technology', 'tech', 'it', 'coding',
      'product', 'qa', 'quality', 'test', 'intern' // Most internships are relevant
    ]
    
    const relevantInternships = internships.filter(intern => {
      const titleLower = (intern.role_title || '').toLowerCase()
      const isRelevant = csKeywords.some(keyword => titleLower.includes(keyword))
      return isRelevant
    })

    console.log(`Filtered to ${relevantInternships.length} CS-relevant internships`)

    // Deduplicate and insert
    let inserted = 0
    let skipped = 0
    const errors = []

    for (const internship of relevantInternships.slice(0, 200)) { // Process in batches
      try {
        // Check if already exists
        const { data: existing } = await supabase
          .from('internships')
          .select('id')
          .eq('company', internship.company)
          .ilike('role_title', `%${internship.role_title.substring(0, 20)}%`)
          .single()

        if (existing) {
          skipped++
          continue
        }

        // Determine if Texas-based
        const texasKeywords = ['TX', 'Texas', 'Austin', 'Houston', 'Dallas', 
                              'San Antonio', 'Fort Worth', 'Plano', 'Irving']
        const isTexas = texasKeywords.some(keyword => 
          internship.location.includes(keyword)
        )

        // Insert new internship
        const { error: insertError } = await supabase
          .from('internships')
          .insert({
            company: internship.company.substring(0, 255), // Limit length
            role_title: internship.role_title.substring(0, 255),
            location: internship.location.substring(0, 255),
            application_link: internship.application_link,
            is_texas: isTexas,
            remote_flag: internship.location.toLowerCase().includes('remote'),
            employment_type: 'internship',
            source_url: 'https://github.com/SimplifyJobs/Summer2025-Internships',
            date_posted: internship.date_posted,
            visa_sponsorship: internship.is_sponsorship_available ? 'Yes' : 'Unspecified',
            scrape_source: 'simplify_jobs',
            link_valid: true,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })

        if (insertError) {
          console.error(`Insert error for ${internship.company}: ${insertError.message}`)
          errors.push(`${internship.company}: ${insertError.message}`)
        } else {
          inserted++
          console.log(`✓ Added: ${internship.company} - ${internship.role_title}`)
        }

      } catch (err: any) {
        console.error(`Error processing ${internship.company}:`, err)
        errors.push(`${internship.company}: ${(err as Error).message}`)
      }
    }

    // Return detailed results
    return new Response(
      JSON.stringify({
        success: true,
        source: 'SimplifyJobs GitHub',
        total_parsed: internships.length,
        cs_relevant: relevantInternships.length,
        inserted,
        skipped,
        errors: errors.slice(0, 10),
        sample: relevantInternships.slice(0, 3).map(i => ({
          company: i.company,
          role: i.role_title,
          location: i.location
        }))
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Scraping error:', error)
    return new Response(
      JSON.stringify({ 
        error: (error as Error).message,
        success: false 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})