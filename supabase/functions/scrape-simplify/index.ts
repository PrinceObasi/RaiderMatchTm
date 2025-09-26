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

    // Try multiple sources in order of preference
    const sources = [
      'https://raw.githubusercontent.com/SimplifyJobs/Summer2026-Internships/dev/README.md',
      'https://raw.githubusercontent.com/SimplifyJobs/Summer2025-Internships/dev/README.md',
      'https://raw.githubusercontent.com/SimplifyJobs/Summer2025-Internships/main/README.md'
    ]

    let markdown = ''
    let sourceUsed = ''
    
    for (const source of sources) {
      try {
        console.log(`Trying source: ${source}`)
        const response = await fetch(source)
        if (response.ok) {
          markdown = await response.text()
          sourceUsed = source
          console.log(`Successfully fetched from: ${source}`)
          break
        }
      } catch (err) {
        console.log(`Failed to fetch from ${source}: ${err}`)
        continue
      }
    }
    
    if (!markdown) {
      throw new Error('Failed to fetch data from all Simplify.jobs sources')
    }
    
    // Parse the markdown table
    const lines = markdown.split('\n')
    const internships: ParsedInternship[] = []
    let inTable = false
    let skipHeader = true
    
    console.log(`Processing ${lines.length} lines from markdown`)
    console.log('First 20 lines:')
    lines.slice(0, 20).forEach((line, i) => console.log(`${i}: ${line}`))
    
    for (const line of lines) {
      // More flexible table detection - look for any table with Company and Role columns
      if (line.includes('|') && 
          (line.toLowerCase().includes('company') || line.toLowerCase().includes('role')) &&
          line.split('|').length >= 4) {
        console.log(`Found potential table header: ${line}`)
        inTable = true
        continue
      }
      
      // Skip the separator line
      if (inTable && line.includes('|') && line.includes('---')) {
        console.log('Found table separator, starting data parsing')
        skipHeader = false
        continue
      }
      
      // Parse table rows
      if (inTable && !skipHeader && line.startsWith('|') && line.includes('|')) {
        const parts = line.split('|').map(p => p.trim()).filter(p => p)
        console.log(`Parsing row with ${parts.length} parts: ${parts.join(' | ')}`)
        
        if (parts.length >= 4) {
          // Extract company name (remove emoji indicators and clean)
          let company = parts[0].replace(/↳/g, '').replace(/🛂/g, '').trim()
          // Remove common emoji and special characters but keep company names intact
          company = company.replace(/[📍🔒🛂⭐️]/g, '').trim()
          
          // Extract role title (clean up any emoji)
          let role = parts[1].replace(/[📍🔒🛂⭐️]/g, '').trim()
          
          // Extract location (clean up any emoji)
          let location = parts[2].replace(/[📍🔒🛂⭐️]/g, '').trim()
          
          // Extract application link - handle multiple formats
          let appLink = ''
          const applicationCell = parts[3] || ''
          
          // Try different link formats
          const linkMatch = applicationCell.match(/\[.*?\]\((.*?)\)/) || 
                           applicationCell.match(/(https?:\/\/[^\s\)]+)/) ||
                           applicationCell.match(/href=["']([^"']+)["']/)
          
          if (linkMatch) {
            appLink = linkMatch[1]
          } else if (applicationCell.includes('http')) {
            // Last resort: extract any URL-like string
            const urlMatch = applicationCell.match(/(https?:\/\/[^\s<>]+)/)
            if (urlMatch) appLink = urlMatch[1]
          }
          
          // Skip if no valid application link or if it's locked
          if (!appLink || appLink === '🔒' || appLink.includes('🔒') || 
              applicationCell.includes('🔒') || applicationCell.toLowerCase().includes('closed')) {
            console.log(`Skipping ${company} - no valid application link`)
            continue
          }
          
          // Check for visa sponsorship (look for visa emoji 🛂)
          const sponsorshipAvailable = line.includes('🛂')
          
          // Validate required fields
          if (company && role && location && appLink && 
              company.length > 1 && role.length > 1 && location.length > 1) {
            console.log(`✓ Valid internship: ${company} - ${role} in ${location}`)
            internships.push({
              company,
              role_title: role,
              location,
              application_link: appLink,
              date_posted: new Date().toISOString().split('T')[0],
              is_sponsorship_available: sponsorshipAvailable
            })
          } else {
            console.log(`✗ Invalid data: company="${company}", role="${role}", location="${location}", link="${appLink}"`)
          }
        }
      }
      
      // Detect end of table - stop when we hit non-table content
      if (inTable && !skipHeader && line.trim() && !line.startsWith('|') && !line.includes('---')) {
        console.log(`End of table detected at line: ${line}`)
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
            source_url: sourceUsed.replace('/raw/', '/').replace('/README.md', ''),
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
        source: sourceUsed,
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