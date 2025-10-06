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
    
    // Track if we're inside a table
    let inTable = false;
    let headerPassed = false;

    for (const line of lines) {
      // Detect markdown table rows (start and end with |)
      if (/^\|.+\|$/.test(line.trim())) {
        inTable = true;
        
        // Skip header row (contains "Company" or "Location")
        if (line.includes('Company') || line.includes('Location') || line.includes('Application')) {
          continue;
        }
        
        // Skip separator row (contains ---)
        if (line.includes('---')) {
          headerPassed = true;
          continue;
        }
        
        if (!headerPassed) continue;
        
        // Split by | and clean up
        const columns = line.split('|').map(col => col.trim()).filter(col => col.length > 0);
        
        if (columns.length < 4) continue;
        
        // Extract company name from markdown link [Company](url) or just text
        const companyCol = columns[0];
        const companyMatch = companyCol.match(/\[([^\]]+)\]/) || companyCol.match(/\*\*([^*]+)\*\*/) || [null, companyCol];
        const company = companyMatch[1]?.trim();
        
        if (!company) continue;
        
        // Extract role (plain text, may have links)
        const roleCol = columns[1];
        const roleMatch = roleCol.match(/\[([^\]]+)\]/) || [null, roleCol];
        const role = roleMatch[1]?.trim() || roleCol.trim();
        
        // Extract location
        const location = columns[2].replace(/[*_]/g, '').trim() || 'United States';
        
        // Extract direct link from application column
        // Format: [🔗 Apply](direct_link) or multiple links
        const appCol = columns[3];
        const allLinks = [...appCol.matchAll(/\(([^)]+)\)/g)].map(m => m[1]);
        
        // Get first link that's NOT simplify.jobs
        const directLink = allLinks.find(link => !link.includes('simplify.jobs'));
        
        if (!directLink) continue;
        
        // Determine ATS type
        let atsType = 'unknown';
        if (directLink.includes('greenhouse.io')) atsType = 'greenhouse';
        else if (directLink.includes('lever.co')) atsType = 'lever';
        else if (directLink.includes('myworkdayjobs.com')) atsType = 'workday';
        else if (directLink.includes('jobvite.com')) atsType = 'jobvite';
        else if (directLink.includes('icims.com')) atsType = 'icims';
        else if (directLink.includes('smartrecruiters.com')) atsType = 'smartrecruiters';
        else if (directLink.includes('ashbyhq.com')) atsType = 'ashby';
        else if (directLink.includes('breezy.hr')) atsType = 'breezy';
        else if (directLink.includes('recruitee.com')) atsType = 'recruitee';
        else if (directLink.includes('workable.com')) atsType = 'workable';
        
        internships.push({
          company: company.substring(0, 255),
          role_title: role.substring(0, 255),
          location: location.substring(0, 255),
          application_link: directLink,
          direct_link: directLink,
          is_direct: true,
          link_type: 'direct',
          final_domain: atsType !== 'unknown' ? atsType : null,
          date_posted: new Date().toISOString().split('T')[0],
          is_sponsorship_available: line.includes('🛂')
        });
      }
    }

    console.log(`Parsed ${internships.length} internships`)
    
    if (internships.length === 0) {
      console.warn('No internships parsed - table format may have changed')
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No internships found - README format may have changed',
          total_parsed: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Insert into database
    let inserted = 0
    let skipped = 0
    const errors = []

    for (const internship of internships) {
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
            application_link: internship.direct_link,
            direct_link: internship.direct_link,
            is_direct: true,
            link_type: 'direct',
            final_domain: internship.final_domain,
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
        source: 'SimplifyJobs GitHub (Markdown format)',
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