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
    console.log(`Fetched ${markdown.length} characters from raw README`)
    
    // Extract only Software Engineering section
    // Try multiple possible heading formats
    const possibleStarts = [
      '## 💻 Software Engineering Internship Roles',
      '## Software Engineering Internship Roles',
      '💻 Software Engineering',
      '## 💻 Software Engineering'
    ]
    
    const possibleEnds = [
      '## 📱 Product Management Internship Roles',
      '## Product Management Internship Roles',
      '📱 Product Management',
      '## 📱 Product Management'
    ]
    
    let startIdx = -1
    let startMarker = ''
    for (const marker of possibleStarts) {
      startIdx = markdown.indexOf(marker)
      if (startIdx !== -1) {
        startMarker = marker
        console.log(`✓ Found start marker: "${marker}" at position ${startIdx}`)
        break
      }
    }
    
    let endIdx = -1
    let endMarker = ''
    for (const marker of possibleEnds) {
      endIdx = markdown.indexOf(marker, startIdx + 1) // Search after start
      if (endIdx !== -1) {
        endMarker = marker
        console.log(`✓ Found end marker: "${marker}" at position ${endIdx}`)
        break
      }
    }
    
    // Debug: Show what we found if not found
    if (startIdx === -1) {
      console.warn('⚠️ Start marker not found, trying fallback patterns...')
      console.log('Content around position 5000-6000:', markdown.substring(5000, 6000))
    }
    
    // Additional debug: show content AFTER the end marker to verify boundary
    if (endIdx !== -1) {
      console.log('Content right after end marker (next 500 chars):', markdown.substring(endIdx, endIdx + 500))
    }
    
    let sweOnly = markdown
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      sweOnly = markdown.slice(startIdx, endIdx)
      console.log(`✓ Sliced to SWE-only section: ${sweOnly.length} characters`)
      
      // Debug: Check if slice contains non-SWE keywords
      const hasProduct = sweOnly.toLowerCase().includes('product manager')
      const hasData = sweOnly.toLowerCase().includes('data scientist')
      const hasQuant = sweOnly.toLowerCase().includes('quantitative')
      console.log(`DEBUG - Section contains: Product Manager: ${hasProduct}, Data Scientist: ${hasData}, Quant: ${hasQuant}`)
      
      console.log(`Preview:`, sweOnly.substring(0, 300).replace(/\n/g, ' '))
    } else {
      console.warn('⚠️ Could not find SWE section markers, parsing full README')
      console.warn(`Start found: ${startIdx !== -1}, End found: ${endIdx !== -1}`)
    }
    
    // Parse HTML table rows - each <tr> spans multiple lines
    const rows = sweOnly.split('<tr>').slice(1); // Skip first split (before first <tr>)
    console.log(`Found ${rows.length} table rows`)
    
    // Define SWE filtering keywords
    const NON_SWE_KEYWORDS = [
      'product manager',
      'product management',
      'product intern',
      'data scientist',
      'data science intern',
      'data analyst',
      'quantitative researcher',
      'quant researcher',
      'quantitative analyst',
      'trading analyst',
      'hardware engineer',
      'electrical engineer',
      'firmware engineer',
      'analog engineer',
      'rf engineer',
      'mechanical engineer',
    ];

    const SWE_KEYWORDS = [
      'software engineer',
      'software engineering',
      'swe',
      'full stack',
      'full-stack',
      'frontend engineer',
      'front end engineer',
      'backend engineer',
      'back end engineer',
      'web engineer',
      'mobile engineer',
      'ios engineer',
      'android engineer',
      'platform engineer',
      'infrastructure engineer',
      'devops engineer',
      'site reliability',
      'sre',
      'ml engineer',
      'machine learning engineer',
    ];

    const internships = [];
    let skippedNonSwe = 0;

    for (const row of rows) {
      // Skip header rows
      if (row.includes('<thead>') || row.includes('<th>')) continue;
      
      // Extract company name from <strong><a>COMPANY</a></strong>
      const companyMatch = row.match(/<strong>(?:<a[^>]*>)?([^<]+)(?:<\/a>)?<\/strong>/);
      if (!companyMatch) continue;
      
      const company = companyMatch[1].trim();
      
      // Extract all <td> content
      const tdMatches = [...row.matchAll(/<td[^>]*>(.*?)<\/td>/gs)];
      if (tdMatches.length < 4) continue;
      
      // Role is in second <td> (index 1)
      const roleHtml = tdMatches[1][1];
      const roleText = roleHtml.replace(/<[^>]+>/g, '').trim();
      
      // Filter out non-SWE roles
      const titleLower = roleText.toLowerCase();
      const isNonSwe = NON_SWE_KEYWORDS.some(kw => titleLower.includes(kw));
      const hasSweKeyword = SWE_KEYWORDS.some(kw => titleLower.includes(kw));
      
      if (isNonSwe || !hasSweKeyword) {
        skippedNonSwe++;
        continue;
      }
      
      // Location is in third <td> (index 2)  
      const locationHtml = tdMatches[2][1];
      const locationText = locationHtml.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() || 'United States';
      
      // Application links in fourth <td> (index 3)
      const appHtml = tdMatches[3][1];
      const allLinks = [...appHtml.matchAll(/href="([^"]+)"/g)].map(m => m[1]);
      
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
        role_title: roleText.substring(0, 255),
        location: locationText.substring(0, 255),
        application_link: directLink,
        direct_link: directLink,
        is_direct: true,
        link_type: 'direct',
        final_domain: atsType !== 'unknown' ? atsType : null,
        date_posted: new Date().toISOString().split('T')[0],
        is_sponsorship_available: row.includes('🛂') || row.includes('🇺🇸')
      });
    }

    console.log(`Parsed ${internships.length} SWE internships, skipped ${skippedNonSwe} non-SWE roles`)
    
    if (internships.length === 0) {
      console.warn('No internships parsed - table format may have changed')
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No internships found - README format may have changed',
          total_parsed: 0,
          skipped_non_swe: skippedNonSwe
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
          .maybeSingle()

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

    // Trigger enrichment for the newly inserted internships
    if (inserted > 0) {
      try {
        console.log(`Triggering enrichment for ${inserted} new internships...`)
        const enrichUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/trigger-enrichment`
        await fetch(enrichUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ limit: Math.min(inserted, 100) })
        }).catch(err => console.error('Failed to trigger enrichment:', err))
      } catch (err) {
        console.error('Enrichment trigger error:', err)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        source: 'SimplifyJobs GitHub (SWE roles only)',
        total_parsed: internships.length,
        skipped_non_swe: skippedNonSwe,
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