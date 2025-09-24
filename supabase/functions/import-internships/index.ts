import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as Papa from 'https://esm.sh/papaparse@5.4.1'
import * as XLSX from 'https://esm.sh/xlsx@0.18.5'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-key',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Check API key authentication
    const adminKey = req.headers.get('x-admin-key')
    const expectedKey = Deno.env.get('IMPORT_ADMIN_KEY')
    
    if (!adminKey || adminKey !== expectedKey) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Parse multipart form data
    const formData = await req.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`Processing file: ${file.name}, type: ${file.type}, size: ${file.size}`)

    let parsedData: any[] = []
    const fileExtension = file.name.toLowerCase().split('.').pop()

    // Parse file based on extension
    if (fileExtension === 'csv') {
      const rawText = await file.text();

      // Normalize "fully-quoted lines" CSV (each line wrapped in quotes) and fix header
      const normalizeWeirdCSV = (input: string): string => {
        const withoutBOM = input.replace(/^\uFEFF/, '');
        const lines = withoutBOM.split(/\r?\n/);
        // Look at a sample of lines to decide
        const sample = lines.slice(0, Math.min(lines.length, 20)).filter(l => l.trim().length > 0);
        const looksAllWrapped = sample.every(l => {
          const t = l.trim();
          return t.startsWith('"') && t.endsWith('"');
        });
        if (looksAllWrapped) {
          return lines.map(l => {
            const t = l.trim();
            if (t.startsWith('"') && t.endsWith('"')) {
              return t.slice(1, -1).replace(/""/g, '"');
            }
            return l;
          }).join('\n');
        }
        return withoutBOM;
      };

      let cleanedText = normalizeWeirdCSV(rawText);

      // Additional fix: if someone split the header on two lines, merge them
      {
        const lines = cleanedText.split('\n');
        if (lines.length > 1 && lines[0].includes(',') && lines[1].trim() && !lines[1].includes(',')) {
          const mergedHeader = lines[0].trim().replace(/,$/, '') + ',' + lines[1].trim();
          cleanedText = mergedHeader + '\n' + lines.slice(2).join('\n');
        }
      }

      const result = Papa.parse(cleanedText, {
        header: true,
        skipEmptyLines: true,
        delimiter: ',',
        quoteChar: '"',
        escapeChar: '"',
      });
      parsedData = result.data as any[]
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      parsedData = XLSX.utils.sheet_to_json(worksheet)
    } else {
      return new Response(JSON.stringify({ error: 'Unsupported file format. Please upload CSV or XLSX.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`Parsed ${parsedData.length} rows from file`)

    // Helper function to find header case-insensitively
    const findHeader = (row: any, headerName: string): string | undefined => {
      const keys = Object.keys(row)
      const found = keys.find(key => key.toLowerCase() === headerName.toLowerCase())
      return found ? row[found] : undefined
    }

    // Helper function to check if location indicates Texas
    const isTexasLocation = (location: string): boolean => {
      if (!location) return false
      const txKeywords = ['tx', 'texas', 'austin', 'dallas', 'houston', 'san antonio', 'irving', 'plano', 'richardson', 'spring', 'coppell', 'southlake']
      return txKeywords.some(keyword => location.toLowerCase().includes(keyword))
    }

    // Helper function to determine sponsorship flag
    const getSponsorshipFlag = (intlFriendly: string): string => {
      if (!intlFriendly) return 'unknown'
      return intlFriendly.toLowerCase().includes('cpt/opt') ? 'cpt_opt_ok' : 'unknown'
    }

    // Helper function to parse UTC date
    const parseUTCDate = (dateStr: string): string | null => {
      if (!dateStr) return null
      try {
        const date = new Date(dateStr)
        return date.toISOString()
      } catch {
        return null
      }
    }

    // Helper function to parse tech stack from string
    const parseTechStack = (techStr: string): string[] => {
      if (!techStr) return []
      // Split by common separators and clean up
      return techStr.split(/[,\s]+/)
        .map(tech => tech.trim().toLowerCase())
        .filter(tech => tech && tech.length > 1)
        .slice(0, 10) // Limit to 10 technologies
    }

    // Helper function to normalize visa sponsorship
    const normalizeVisaSponsorship = (visa: string): 'Yes' | 'No' | 'Unspecified' => {
      if (!visa) return 'Unspecified'
      const lower = visa.toLowerCase()
      if (lower === 'yes' || lower === 'sponsors') return 'Yes'
      if (lower === 'no') return 'No'
      return 'Unspecified'
    }

    // Map and transform data - handle both old and new CSV formats
    const transformedData = parsedData.map(row => {
      // Try new format first (your CSV), then fall back to old format
      const company = findHeader(row, 'Company') || ''
      const roleTitle = findHeader(row, 'Role_Title') || findHeader(row, 'Role Title') || 'Software Engineering Intern'
      const location = findHeader(row, 'Location') || ''
      const applyUrl = findHeader(row, 'Internship_URL') || findHeader(row, 'Application_Link') || findHeader(row, 'Apply Link') || findHeader(row, 'Source URL') || ''
      const datePosted = findHeader(row, 'Date_Posted') || findHeader(row, 'Date Posted') || ''
      const visaSponsorship = findHeader(row, 'Visa_Sponsorship') || findHeader(row, 'Intl-friendly (historical)') || ''
      const techStack = findHeader(row, 'Tech_Stack') || ''
      
      // Legacy fields for backward compatibility
      const category = findHeader(row, 'Category') || null
      const txRole = findHeader(row, 'TX Role?') || ''
      const sourceUrl = findHeader(row, 'Source URL') || ''
      const lastChecked = findHeader(row, 'Last Checked (UTC)') || ''

      return {
        company: company.trim(),
        role_title: roleTitle.trim(),
        category,
        location: location.trim(),
        application_link: applyUrl.trim(),
        is_texas: isTexasLocation(txRole || location),
        sponsorship_flag: getSponsorshipFlag(visaSponsorship),
        visa_sponsorship: normalizeVisaSponsorship(visaSponsorship),
        employment_type: 'internship',
        apply_url: applyUrl.trim() || null,
        source_url: sourceUrl.trim() || null,
        date_posted: datePosted ? new Date(datePosted).toISOString().split('T')[0] : null,
        last_checked_utc: parseUTCDate(lastChecked),
        tech_stack: parseTechStack(techStack),
        remote_flag: location.toLowerCase().includes('remote') || null,
        notes: null
      }
    }).filter(item => item.company) // Filter out rows without company name

    console.log(`Transformed ${transformedData.length} valid rows`)

    // Chunk data into batches of 500
    const chunkSize = 500
    const chunks = []
    for (let i = 0; i < transformedData.length; i += chunkSize) {
      chunks.push(transformedData.slice(i, i + chunkSize))
    }

    console.log(`Processing ${chunks.length} chunks of data`)

    let totalInserted = 0
    let totalUpdated = 0
    let totalErrors = 0

    // Process each chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      console.log(`Processing chunk ${i + 1}/${chunks.length} with ${chunk.length} rows`)

      try {
        const { data, error } = await supabase
          .from('internships')
          .upsert(chunk, { 
            onConflict: 'company,role_title,location,date_posted',
            ignoreDuplicates: false 
          })
          .select('id')

        if (error) {
          console.error(`Error in chunk ${i + 1}:`, error)
          totalErrors += chunk.length
        } else {
          // Note: Supabase doesn't directly tell us inserted vs updated count
          // We'll count all successful operations as "processed"
          totalInserted += data?.length || chunk.length
          console.log(`Successfully processed chunk ${i + 1}`)
        }
      } catch (chunkError) {
        console.error(`Exception in chunk ${i + 1}:`, chunkError)
        totalErrors += chunk.length
      }
    }

    const summary = {
      total: transformedData.length,
      inserted: totalInserted, // This actually represents total processed
      updated: 0, // Supabase upsert doesn't distinguish between insert/update
      errors: totalErrors
    }

    console.log('Import summary:', summary)

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in import-internships function:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: (error as Error).message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})