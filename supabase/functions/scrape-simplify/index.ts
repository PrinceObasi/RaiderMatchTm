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

    console.log('Fetching Simplify.jobs internship list...')

    // Fetch the README from Simplify.jobs GitHub
    const response = await fetch(
      'https://raw.githubusercontent.com/SimplifyJobs/Summer2025-Internships/main/README.md'
    )
    
    if (!response.ok) {
      throw new Error(`Failed to fetch Simplify data: ${response.status}`)
    }

    const markdown = await response.text()
    
    // Parse the markdown table
    const lines = markdown.split('\n')
    const internships: ParsedInternship[] = []
    let inTable = false
    let skipHeader = true
    
    for (const line of lines) {
      // Detect start of table
      if (line.includes('| Company |') && line.includes('| Role |')) {
        inTable = true
        continue
      }
      
      // Skip the separator line
      if (inTable && line.includes('|---')) {
        skipHeader = false
        continue
      }
      
      // Parse table rows
      if (inTable && !skipHeader && line.startsWith('|') && line.includes('|')) {
        const parts = line.split('|').map(p => p.trim()).filter(p => p)
        
        if (parts.length >= 4) {
          // Extract company name (remove emoji indicators)
          let company = parts[0].replace(/↳/g, '').trim()
          // Remove any emoji or special characters
          company = company.replace(/[^\w\s\-\.&]/g, '').trim()
          
          // Extract role title
          let role = parts[1].trim()
          
          // Extract location
          let location = parts[2].trim()
          
          // Extract application link from markdown format [Apply](URL)
          let appLink = ''
          const linkMatch = parts[3].match(/\[.*?\]\((.*?)\)/)
          if (linkMatch) {
            appLink = linkMatch[1]
          }
          
          // Skip if no valid application link
          if (!appLink || appLink === '🔒' || appLink.includes('🔒')) {
            continue
          }
          
          // Check for visa sponsorship (look for visa emoji 🛂)
          const sponsorshipAvailable = line.includes('🛂')
          
          // Only add if we have valid data
          if (company && role && location && appLink) {
            internships.push({
              company,
              role_title: role,
              location,
              application_link: appLink,
              date_posted: new Date().toISOString().split('T')[0],
              is_sponsorship_available: sponsorshipAvailable
            })
          }
        }
      }
      
      // Detect end of table
      if (inTable && !line.startsWith('|')) {
        break
      }
    }

    console.log(`Parsed ${internships.length} internships from Simplify.jobs`)

    // Filter for CS-related roles
    const csKeywords = [
      'software', 'engineer', 'developer', 'programming', 'sde',
      'data', 'machine learning', 'ml', 'ai', 'backend', 'frontend',
      'fullstack', 'full-stack', 'devops', 'cloud', 'security',
      'ios', 'android', 'mobile', 'web', 'platform', 'infrastructure',
      'systems', 'computer', 'technology', 'tech', 'it'
    ]
    
    const relevantInternships = internships.filter(intern => {
      const titleLower = intern.role_title.toLowerCase()
      return csKeywords.some(keyword => titleLower.includes(keyword))
    })

    console.log(`Filtered to ${relevantInternships.length} CS-relevant internships`)

    // Check for duplicates and insert new ones
    let inserted = 0
    let skipped = 0
    const errors: string[] = []

    for (const internship of relevantInternships) {
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
                              'San Antonio', 'Fort Worth', 'Plano', 'Irving', 
                              'Arlington', 'Lubbock', 'El Paso']
        const isTexas = texasKeywords.some(keyword => 
          internship.location.includes(keyword)
        )

        // Determine remote flag
        const isRemote = internship.location.toLowerCase().includes('remote')

        // Determine visa sponsorship
        let sponsorshipFlag = 'unknown'
        if (internship.is_sponsorship_available) {
          sponsorshipFlag = 'yes'
        }

        // Insert new internship
        const { error: insertError } = await supabase
          .from('internships')
          .insert({
            company: internship.company,
            role_title: internship.role_title,
            location: internship.location,
            application_link: internship.application_link,
            is_texas: isTexas,
            remote_flag: isRemote,
            employment_type: 'internship',
            source_url: 'https://github.com/SimplifyJobs/Summer2025-Internships',
            date_posted: internship.date_posted,
            visa_sponsorship: sponsorshipFlag === 'yes' ? 'Yes' : 'Unspecified',
            scrape_source: 'simplify_jobs',
            link_valid: true,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })

        if (insertError) {
          console.error(`Failed to insert ${internship.company}: ${insertError.message}`)
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

    return new Response(
      JSON.stringify({
        success: true,
        source: 'Simplify.jobs GitHub',
        total_parsed: internships.length,
        cs_relevant: relevantInternships.length,
        inserted,
        skipped,
        errors: errors.slice(0, 10) // Return first 10 errors
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