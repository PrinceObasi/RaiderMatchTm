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
    
    const lines = markdown.split('\n');
    const internships = [];

    for (const line of lines) {
      // Look for table rows with company data
      if (line.includes('<td>') && line.includes('<strong>') && line.includes('href=')) {
        // Extract company from: <strong><a href="...">COMPANY</a></strong>
        const companyMatch = line.match(/<strong><a[^>]*>([^<]+)<\/a><\/strong>/);
        
        // Extract role from the next <td>
        const roleMatch = line.match(/<\/td>\s*<td>([^<]+)<\/td>/);
        
        // Extract apply link (the Simplify redirect URL)
        const applyMatch = line.match(/href="(https:\/\/simplify\.jobs\/[^"]+)"/);
        
        if (companyMatch && applyMatch) {
          internships.push({
            company: companyMatch[1].trim(),
            role_title: roleMatch ? roleMatch[1].trim() : 'Software Engineering Intern',
            location: 'United States', // Will need to parse this better
            application_link: applyMatch[1],
            date_posted: new Date().toISOString().split('T')[0],
            is_sponsorship_available: line.includes('🛂')
          });
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