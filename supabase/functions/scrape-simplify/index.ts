import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function parseInternships(markdown: string, sourceUrl: string): Promise<ParsedInternship[]> {
  const lines = markdown.split('\n')
  const internships: ParsedInternship[] = []
  
  console.log(`Processing ${lines.length} lines from markdown`)
  console.log('First 30 lines:')
  lines.slice(0, 30).forEach((line, i) => console.log(`${i}: ${line}`))
  
  // Strategy 1: Parse traditional markdown tables
  const tableResults = parseMarkdownTables(lines)
  internships.push(...tableResults)
  console.log(`Strategy 1 (tables): Found ${tableResults.length} internships`)
  
  // Strategy 2: Parse HTML tables if markdown tables failed
  if (tableResults.length === 0) {
    const htmlResults = parseHtmlTables(markdown)
    internships.push(...htmlResults)
    console.log(`Strategy 2 (HTML): Found ${htmlResults.length} internships`)
  }
  
  // Strategy 3: Parse bullet point lists if previous strategies failed
  if (internships.length === 0) {
    const listResults = parseBulletLists(lines)
    internships.push(...listResults)
    console.log(`Strategy 3 (lists): Found ${listResults.length} internships`)
  }
  
  // Strategy 4: Parse category sections if still no results
  if (internships.length === 0) {
    const categoryResults = await parseCategorySections(markdown, sourceUrl)
    internships.push(...categoryResults)
    console.log(`Strategy 4 (categories): Found ${categoryResults.length} internships`)
  }
  
  return internships
}

function parseMarkdownTables(lines: string[]): ParsedInternship[] {
  const internships: ParsedInternship[] = []
  let inTable = false
  let skipHeader = true
  let headerColumns: string[] = []
  
  for (const line of lines) {
    // Flexible table detection - look for pipe-separated headers
    if (line.includes('|') && line.split('|').length >= 3) {
      const cells = line.split('|').map(c => c.trim()).filter(c => c)
      
      // Check if this looks like a header row
      if (cells.some(cell => 
          cell.toLowerCase().includes('company') || 
          cell.toLowerCase().includes('role') || 
          cell.toLowerCase().includes('position') ||
          cell.toLowerCase().includes('location')
        )) {
        console.log(`Found table header: ${line}`)
        headerColumns = cells
        inTable = true
        continue
      }
    }
    
    // Skip separator lines
    if (inTable && line.includes('|') && line.includes('---')) {
      console.log('Found table separator')
      skipHeader = false
      continue
    }
    
    // Parse data rows
    if (inTable && !skipHeader && line.includes('|')) {
      const cells = line.split('|').map(c => c.trim()).filter(c => c)
      
      if (cells.length >= 3) {
        const internship = extractInternshipFromCells(cells, headerColumns)
        if (internship) {
          internships.push(internship)
        }
      }
    }
    
    // Stop parsing if we've left the table
    if (inTable && !skipHeader && line.trim() && !line.includes('|') && !line.includes('---')) {
      break
    }
  }
  
  return internships
}

function parseHtmlTables(markdown: string): ParsedInternship[] {
  const internships: ParsedInternship[] = []
  
  // Look for HTML table structures
  const tableRegex = /<table[^>]*>(.*?)<\/table>/gis
  const tables = markdown.match(tableRegex) || []
  
  for (const table of tables) {
    const rows = table.match(/<tr[^>]*>(.*?)<\/tr>/gis) || []
    let headerProcessed = false
    
    for (const row of rows) {
      const cells = (row.match(/<t[hd][^>]*>(.*?)<\/t[hd]>/gis) || [])
        .map(cell => cell.replace(/<[^>]*>/g, '').trim())
      
      if (!headerProcessed) {
        headerProcessed = true
        continue
      }
      
      if (cells.length >= 3) {
        const internship = extractInternshipFromCells(cells, [])
        if (internship) {
          internships.push(internship)
        }
      }
    }
  }
  
  return internships
}

function parseBulletLists(lines: string[]): ParsedInternship[] {
  const internships: ParsedInternship[] = []
  
  for (const line of lines) {
    // Look for bullet points or list items with company and link patterns
    if ((line.startsWith('- ') || line.startsWith('* ') || line.match(/^\d+\./)) && 
        line.includes('http') && line.includes('[') && line.includes(']')) {
      
      const internship = extractInternshipFromText(line)
      if (internship) {
        internships.push(internship)
      }
    }
  }
  
  return internships
}

async function parseCategorySections(markdown: string, baseUrl: string): Promise<ParsedInternship[]> {
  const internships: ParsedInternship[] = []
  
  // Look for category sections like "💻 **[Software Engineering](...)**"
  const categoryRegex = /\*\*\[([^\]]+)\]\(([^)]+)\)\*\*/g
  const categories = []
  let match
  
  while ((match = categoryRegex.exec(markdown)) !== null) {
    const [, title, url] = match
    if (title.toLowerCase().includes('software') || 
        title.toLowerCase().includes('engineer') ||
        title.toLowerCase().includes('data') ||
        title.toLowerCase().includes('tech')) {
      categories.push({ title, url })
    }
  }
  
  console.log(`Found ${categories.length} relevant categories`)
  
  // Try to fetch content from category URLs (first one only to avoid rate limiting)
  if (categories.length > 0) {
    try {
      const categoryUrl = categories[0].url.startsWith('http') ? 
        categories[0].url : 
        `https://raw.githubusercontent.com/SimplifyJobs/Summer2026-Internships/dev/README.md${categories[0].url.split('#')[1] ? '#' + categories[0].url.split('#')[1] : ''}`
      
      console.log(`Fetching category content from: ${categoryUrl}`)
      
      // For now, just parse the main README more thoroughly
      const sectionResults = parseInternshipSection(markdown)
      internships.push(...sectionResults)
    } catch (err) {
      console.log(`Failed to fetch category content: ${err}`)
    }
  }
  
  return internships
}

function parseInternshipSection(markdown: string): ParsedInternship[] {
  const internships: ParsedInternship[] = []
  const lines = markdown.split('\n')
  
  // Look for lines that mention companies and have links
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    // Skip headers and navigation
    if (line.startsWith('#') || line.includes('Browse') || line.includes('Category')) {
      continue
    }
    
    // Look for lines with markdown links that might be internships
    if (line.includes('[') && line.includes(']') && line.includes('(http') && 
        (line.includes('intern') || line.includes('software') || line.includes('engineer'))) {
      
      const internship = extractInternshipFromText(line)
      if (internship) {
        internships.push(internship)
      }
    }
  }
  
  return internships
}

function extractInternshipFromCells(cells: string[], headers: string[]): ParsedInternship | null {
  if (cells.length < 3) return null
  
  // Try to map cells to expected fields
  let company = '', role = '', location = '', link = ''
  
  // If we have headers, use them to map fields
  if (headers.length > 0) {
    for (let i = 0; i < cells.length && i < headers.length; i++) {
      const header = headers[i].toLowerCase()
      if (header.includes('company')) company = cleanText(cells[i])
      else if (header.includes('role') || header.includes('position') || header.includes('title')) role = cleanText(cells[i])
      else if (header.includes('location')) location = cleanText(cells[i])
      else if (header.includes('link') || header.includes('apply') || header.includes('url')) link = extractLink(cells[i])
    }
  } else {
    // Default assumption: Company, Role, Location, Link
    company = cleanText(cells[0])
    role = cleanText(cells[1])
    location = cleanText(cells[2])
    link = extractLink(cells[3] || cells[2] || cells[1])
  }
  
  // Validate fields
  if (!company || !role || !link || company.length < 2 || role.length < 2) {
    return null
  }
  
  return {
    company,
    role_title: role,
    location: location || 'Not specified',
    application_link: link,
    date_posted: new Date().toISOString().split('T')[0],
    is_sponsorship_available: cells.join(' ').includes('🛂')
  }
}

function extractInternshipFromText(text: string): ParsedInternship | null {
  // Extract company name (usually at the beginning)
  const companyMatch = text.match(/(?:[-*]\s*)?([^[]+?)\s*[-–]\s*/) || 
                      text.match(/(?:[-*]\s*)?([^[]{2,}?)\s*\[/)
  
  // Extract role from markdown link text
  const roleMatch = text.match(/\[([^\]]+)\]/)
  
  // Extract link from markdown
  const linkMatch = text.match(/\(([^)]+https[^)]+)\)/)
  
  // Extract location (often after the link or in parentheses)
  const locationMatch = text.match(/\)\s*[-–]?\s*([^,\n]+)/) || 
                       text.match(/\(([^)]+(?:Remote|Office|Location|[A-Z]{2})[^)]*)\)/)
  
  if (!companyMatch || !roleMatch || !linkMatch) {
    return null
  }
  
  const company = cleanText(companyMatch[1])
  const role = cleanText(roleMatch[1])
  const link = linkMatch[1].trim()
  const location = locationMatch ? cleanText(locationMatch[1]) : 'Not specified'
  
  if (company.length < 2 || role.length < 2 || !link.startsWith('http')) {
    return null
  }
  
  return {
    company,
    role_title: role,
    location,
    application_link: link,
    date_posted: new Date().toISOString().split('T')[0],
    is_sponsorship_available: text.includes('🛂')
  }
}

function cleanText(text: string): string {
  return text
    .replace(/[📍🔒🛂⭐️↳]/g, '')
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .trim()
}

function extractLink(text: string): string {
  const linkMatch = text.match(/\[.*?\]\((.*?)\)/) || 
                   text.match(/(https?:\/\/[^\s\)]+)/) ||
                   text.match(/href=["']([^"']+)["']/)
  
  return linkMatch ? linkMatch[1] : ''
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
    
    // Parse multiple content formats - tables, lists, and HTML
    const internships = await parseInternships(markdown, sourceUsed)

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