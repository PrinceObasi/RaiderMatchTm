import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper function to check if role is software engineering related
function isSoftwareEngineeringRole(roleTitle: string): boolean {
  const roleLower = roleTitle.toLowerCase();
  
  // Software engineering keywords
  const includeKeywords = [
    'software', 'swe', 'engineer', 'engineering', 
    'developer', 'dev', 'backend', 'frontend', 
    'full stack', 'full-stack', 'fullstack', 'web'
  ];
  
  // Exclude non-SWE roles
  const excludeKeywords = [
    'hardware', 'product manager', 'product management', 
    'data scientist', 'data analyst', 'data engineer',
    'analytics', 'analyst', 'machine learning', 'ml engineer',
    'ai engineer', 'quant', 'trading', 'business',
    'program manager', 'project manager', 'designer', 
    'ux', 'ui', 'qa', 'test', 'quality assurance'
  ];
  
  // Must match at least one include keyword
  const hasInclude = includeKeywords.some(kw => roleLower.includes(kw));
  
  // Must not match any exclude keyword
  const hasExclude = excludeKeywords.some(kw => roleLower.includes(kw));
  
  return hasInclude && !hasExclude;
}

// Helper function to check if location is in the United States
function isUSLocation(location: string): boolean {
  const locationLower = location.toLowerCase();
  
  // Exclude international locations
  const excludeLocations = [
    'canada', 'toronto', 'vancouver', 'montreal', 'ottawa', 'calgary',
    'uk', 'united kingdom', 'london', 'england', 'scotland', 'wales',
    'germany', 'france', 'india', 'china', 'japan', 'australia',
    'singapore', 'hong kong', 'korea', 'brazil', 'mexico'
  ];
  
  if (excludeLocations.some(loc => locationLower.includes(loc))) {
    return false;
  }
  
  // Accept US indicators (state codes in ", ST" format)
  const usStatePattern = /, (al|ak|az|ar|ca|co|ct|de|fl|ga|hi|id|il|in|ia|ks|ky|la|me|md|ma|mi|mn|ms|mo|mt|ne|nv|nh|nj|nm|ny|nc|nd|oh|ok|or|pa|ri|sc|sd|tn|tx|ut|vt|va|wa|wv|wi|wy|dc)/i;
  
  // Accept Remote (assume US-based) or explicit US mentions
  if (locationLower === 'remote' || 
      locationLower.includes('united states') || 
      locationLower.includes('usa') ||
      usStatePattern.test(locationLower)) {
    return true;
  }
  
  return false;
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

    const html = await response.text()
    console.log(`Fetched ${html.length} characters of HTML`)
    
    // Parse HTML table rows - each <tr> spans multiple lines
    const rows = html.split('<tr>').slice(1); // Skip first split (before first <tr>)
    console.log(`Found ${rows.length} table rows`)
    
    const internships = [];
    let filteredRoles = 0;
    let filteredLocations = 0;

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
      
      // Skip non-software engineering roles
      if (!isSoftwareEngineeringRole(roleText)) {
        filteredRoles++;
        continue;
      }
      
      // Location is in third <td> (index 2)  
      const locationHtml = tdMatches[2][1];
      const locationText = locationHtml.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() || 'United States';
      
      // Skip non-US locations
      if (!isUSLocation(locationText)) {
        filteredLocations++;
        continue;
      }
      
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

    console.log(`Parsed ${internships.length} software engineering internships (after filtering)`)
    
    if (internships.length === 0) {
      console.warn('No relevant internships found after filtering')
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No new software engineering roles found in US locations',
          total_parsed: 0,
          filtered_out: rows.length - 1,
          inserted: 0,
          skipped: 0
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

    console.log(`Filtering stats: ${filteredRoles} non-SWE roles filtered, ${filteredLocations} non-US locations filtered`)
    
    return new Response(
      JSON.stringify({
        success: true,
        source: 'SimplifyJobs GitHub (HTML format)',
        total_rows: rows.length,
        filtered_non_swe: filteredRoles,
        filtered_non_us: filteredLocations,
        relevant_roles: internships.length,
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