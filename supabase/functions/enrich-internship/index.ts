import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { id } = await req.json()
    
    if (!id) {
      return new Response(
        JSON.stringify({ error: 'Internship ID required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Starting enrichment for internship ${id}`)

    // Get the internship record
    const { data: internship, error: fetchError } = await supabaseClient
      .from('internships')
      .select('application_link')
      .eq('id', id)
      .single()

    if (fetchError || !internship) {
      console.error('Internship fetch error:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Internship not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!internship.application_link) {
      return new Response(
        JSON.stringify({ error: 'No application URL found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Fetching job page: ${internship.application_link}`)

    // Fetch the job page with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout

    let html: string
    try {
      const response = await fetch(internship.application_link, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      html = await response.text()
      console.log(`Successfully fetched HTML, length: ${html.length}`)
    } catch (fetchError) {
      clearTimeout(timeoutId)
      console.error('Fetch error:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch job page' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Extract enrichment data
    const enrichmentData = extractJobData(html)
    console.log('Extracted data:', enrichmentData)

    // Update the database
    const { error: updateError } = await supabaseClient
      .from('internships')
      .update({
        jd_raw: html.substring(0, 50000), // Limit raw HTML size
        jd_summary: enrichmentData.summary,
        salary_min: enrichmentData.salary_min,
        salary_max: enrichmentData.salary_max,
        salary_currency: enrichmentData.salary_currency,
        salary_period: enrichmentData.salary_period,
        enrichment_confidence: enrichmentData.confidence,
        enriched_at: new Date().toISOString()
      })
      .eq('id', id)

    if (updateError) {
      console.error('Database update error:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to update database' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Enrichment completed successfully')

    return new Response(
      JSON.stringify({
        ok: true,
        jd_summary: enrichmentData.summary,
        salary_min: enrichmentData.salary_min,
        salary_max: enrichmentData.salary_max,
        salary_period: enrichmentData.salary_period
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Enrichment error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function extractJobData(html: string) {
  let summary = ''
  let salary_min: number | null = null
  let salary_max: number | null = null
  let salary_currency = 'USD'
  let salary_period: string | null = null
  let confidence = 40

  try {
    const doc = new DOMParser().parseFromString(html, 'text/html')
    if (!doc) {
      throw new Error('Failed to parse HTML')
    }

    // Extract from meta tags first
    const ogDescription = doc.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
                         doc.querySelector('meta[name="twitter:description"]')?.getAttribute('content') ||
                         doc.querySelector('meta[name="description"]')?.getAttribute('content')

    // Extract salary from JSON-LD
    const jsonLdScripts = doc.querySelectorAll('script[type="application/ld+json"]')
    for (const script of jsonLdScripts) {
      try {
        const jsonLd = JSON.parse(script.textContent || '')
        if (jsonLd.baseSalary) {
          const baseSalary = jsonLd.baseSalary
          if (baseSalary.value) {
            const minValue = baseSalary.value.minValue || baseSalary.value
            const maxValue = baseSalary.value.maxValue || baseSalary.value
            salary_min = parseFloat(minValue)
            salary_max = parseFloat(maxValue)
            salary_currency = baseSalary.currency || 'USD'
            salary_period = baseSalary.unitText || 'year'
            confidence = 100
            break
          }
        }
      } catch (e) {
        console.warn('Failed to parse JSON-LD:', e)
      }
    }

    // Fallback: Extract salary with regex from text content
    if (!salary_min) {
      const text = doc.body?.textContent || ''
      const salaryPatterns = [
        // $40-50/hr, $40-$50 per hour
        /\$?\s?(\d{2,3})(?:,?\d{3})?\s*-\s*\$?\s?(\d{2,3})(?:,?\d{3})?\s*(?:per\s)?(hour|hr)/i,
        // $80k-95k, $80K-$95K
        /\$?\s?(\d{2,3})[kK]\s*-\s*\$?\s?(\d{2,3})[kK]/i,
        // $70,000-$90,000
        /\$?\s?(\d{2,3}),?(\d{3})\s*-\s*\$?\s?(\d{2,3}),?(\d{3})/i,
        // Single values: $25/hr, $85k
        /\$?\s?(\d+(?:\.\d{1,2})?)\s*(hour|hr|k|year|yr|annum)/i
      ]

      for (const pattern of salaryPatterns) {
        const match = text.match(pattern)
        if (match) {
          if (pattern.source.includes('kK')) {
            // Handle k format (80k-95k)
            salary_min = parseInt(match[1]) * 1000
            salary_max = parseInt(match[2]) * 1000
            salary_period = 'year'
            confidence = 70
          } else if (match[3] && match[4]) {
            // Handle full numbers with commas
            salary_min = parseInt(match[1] + match[2])
            salary_max = parseInt(match[3] + match[4])
            salary_period = 'year'
            confidence = 70
          } else if (match[2]) {
            // Handle single value with unit
            const value = parseFloat(match[1])
            const unit = match[2].toLowerCase()
            if (unit.includes('hour') || unit.includes('hr')) {
              salary_min = value
              salary_max = value
              salary_period = 'hour'
            } else if (unit === 'k') {
              salary_min = value * 1000
              salary_max = value * 1000
              salary_period = 'year'
            }
            confidence = 70
          }
          break
        }
      }
    }

    // Generate summary
    if (ogDescription && ogDescription.length > 50) {
      summary = ogDescription.substring(0, 300)
    } else {
      // Extract from main content areas
      const contentSelectors = ['main', 'article', '[class*="job"]', '[class*="description"]', '[class*="content"]']
      let extractedText = ''
      
      for (const selector of contentSelectors) {
        const elements = doc.querySelectorAll(selector)
        for (const element of elements) {
          const text = element.textContent || ''
          if (text.length > 100) {
            extractedText = text.replace(/\s+/g, ' ').trim()
            break
          }
        }
        if (extractedText.length > 100) break
      }

      if (extractedText) {
        // Extract key sentences
        const sentences = extractedText.split(/[.!?]+/).filter(s => s.trim().length > 20)
        const techKeywords = ['python', 'java', 'javascript', 'react', 'node', 'sql', 'aws', 'azure', 'c++', 'c#']
        
        let techSentence = ''
        let roleSentence = ''
        
        for (const sentence of sentences.slice(0, 10)) {
          const lowerSentence = sentence.toLowerCase()
          if (!techSentence && techKeywords.some(keyword => lowerSentence.includes(keyword))) {
            techSentence = sentence.trim()
          }
          if (!roleSentence && (lowerSentence.includes('responsible') || lowerSentence.includes('develop') || lowerSentence.includes('build'))) {
            roleSentence = sentence.trim()
          }
          if (techSentence && roleSentence) break
        }

        const summaryParts = [roleSentence, techSentence].filter(Boolean)
        summary = summaryParts.join('. ').substring(0, 300)
      }
    }

    // Fallback to default summary if nothing extracted
    if (!summary || summary.length < 50) {
      summary = 'Software engineering internship opportunity. Apply to learn more about specific requirements and responsibilities.'
    }

  } catch (error) {
    console.error('Data extraction error:', error)
    summary = 'Software engineering internship opportunity. Apply to learn more about specific requirements and responsibilities.'
  }

  return {
    summary: summary.trim(),
    salary_min,
    salary_max,
    salary_currency,
    salary_period,
    confidence
  }
}