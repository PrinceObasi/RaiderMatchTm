import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const response = await fetch(
      'https://raw.githubusercontent.com/SimplifyJobs/Summer2026-Internships/dev/README.md'
    )
    
    if (!response.ok) {
      throw new Error(`Failed to fetch SimplifyJobs data: ${response.status}`)
    }

    const markdown = await response.text()
    console.log(`Fetched ${markdown.length} characters of markdown`)
    
    const internships = []
    
    // They're using HTML table format now
    // Look for <tr> tags with actual data
    const tableRowRegex = /<tr>\s*<td>([^<]+)<\/td>\s*<td>([^<]+)<\/td>\s*<td>([^<]+)<\/td>\s*<td>(.*?)<\/td>\s*<\/tr>/g
    
    let match
    while ((match = tableRowRegex.exec(markdown)) !== null) {
      const company = match[1].trim()
      const role = match[2].trim()
      const location = match[3].trim()
      const applyCell = match[4]
      
      // Skip header row
      if (company.toLowerCase() === 'company' || company.includes('Company')) {
        continue
      }
      
      // Extract link from apply cell
      const linkMatch = applyCell.match(/href="([^"]+)"/)
      if (!linkMatch) continue
      
      const applicationLink = linkMatch[1]
      
      // Skip closed positions (look for 🔒 or "closed" text)
      if (applyCell.includes('🔒') || applyCell.toLowerCase().includes('closed')) {
        continue
      }
      
      // Clean up company name
      const cleanCompany = company
        .replace(/🛂|🔒|🇺🇸|↳/g, '')
        .replace(/\*\*/g, '')
        .trim()
      
      if (cleanCompany && applicationLink.startsWith('http')) {
        internships.push({
          company: cleanCompany,
          role_title: role || 'Software Engineering Intern',
          location: location || 'United States',
          application_link: applicationLink,
          date_posted: new Date().toISOString().split('T')[0],
          is_sponsorship_available: applyCell.includes('🛂') || company.includes('🛂')
        })
      }
    }
    
    // Alternative: Parse line by line if regex doesn't work
    if (internships.length === 0) {
      console.log('HTML regex failed, trying line-by-line parsing...')
      
      const lines = markdown.split('\n')
      let inTableBody = false
      
      for (const line of lines) {
        // Look for table body start
        if (line.includes('<tbody>')) {
          inTableBody = true
          continue
        }
        
        // Look for table body end
        if (line.includes('</tbody>')) {
          inTableBody = false
          break
        }
        
        // Parse table rows
        if (inTableBody && line.includes('<tr>')) {
          // Extract cells using a simpler approach
          const cells = line.match(/<td>([^<]*)<\/td>/g)
          
          if (cells && cells.length >= 4) {
            const company = cells[0].replace(/<\/?td>/g, '').trim()
            const role = cells[1].replace(/<\/?td>/g, '').trim()
            const location = cells[2].replace(/<\/?td>/g, '').trim()
            
            // Extract link from the 4th cell
            const linkMatch = cells[3].match(/href="([^"]+)"/)
            if (linkMatch) {
              const applicationLink = linkMatch[1]
              
              // Clean and add
              const cleanCompany = company
                .replace(/🛂|🔒|🇺🇸|↳/g, '')
                .replace(/\*\*/g, '')
                .trim()
              
              if (cleanCompany && !cleanCompany.toLowerCase().includes('company') && 
                  applicationLink.startsWith('http')) {
                internships.push({
                  company: cleanCompany,
                  role_title: role || 'Software Engineering Intern',
                  location: location || 'United States',
                  application_link: applicationLink,
                  date_posted: new Date().toISOString().split('T')[0],
                  is_sponsorship_available: line.includes('🛂')
                })
              }
            }
          }
        }
      }
    }

    console.log(`Parsed ${internships.length} internships`)

    // Insert into database
    let inserted = 0
    let skipped = 0
    const errors = []

    for (const internship of internships.slice(0, 200)) { // Limit to 200 for first run
      try {
        // Check for duplicates
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

        // Check if Texas-based
        const texasKeywords = ['TX', 'Texas', 'Austin', 'Houston', 'Dallas', 
                              'San Antonio', 'Fort Worth', 'Plano', 'Irving', 'Lubbock']
        const isTexas = texasKeywords.some(keyword => 
          internship.location.includes(keyword)
        )

        // Insert
        const { error: insertError } = await supabase
          .from('internships')
          .insert({
            company: internship.company.substring(0, 255),
            role_title: internship.role_title.substring(0, 255),
            location: internship.location.substring(0, 255),
            application_link: internship.application_link,
            is_texas: isTexas,
            remote_flag: internship.location.toLowerCase().includes('remote'),
            employment_type: 'internship',
            source_url: 'https://github.com/SimplifyJobs/Summer2026-Internships',
            date_posted: internship.date_posted,
            visa_sponsorship: internship.is_sponsorship_available ? 'Yes' : 'Unspecified',
            scrape_source: 'simplify_jobs',
            link_valid: true,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })

        if (!insertError) {
          inserted++
        } else {
          errors.push(`${internship.company}: ${insertError.message}`)
        }

      } catch (err: any) {
        errors.push(`${internship.company}: ${err.message}`)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        source: 'SimplifyJobs GitHub (HTML format)',
        total_parsed: internships.length,
        inserted,
        skipped,
        errors: errors.slice(0, 5),
        sample: internships.slice(0, 5).map(i => ({
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
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})