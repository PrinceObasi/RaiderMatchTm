import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ValidationResult {
  id: string
  application_link: string
  is_valid: boolean
  status_code: number
  validation_message: string
  checked_at: string
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

    console.log('Starting internship link validation...')

    // Fetch internships that need validation (not checked in last 24 hours)
    const { data: internships, error } = await supabase
      .from('internships')
      .select('id, application_link, company, role_title')
      .not('application_link', 'is', null)
      .or('last_validated_at.is.null,last_validated_at.lt.now() - interval \'24 hours\'')
      .limit(50) // Process in batches to avoid timeouts

    if (error) {
      console.error('Error fetching internships:', error)
      throw error
    }

    console.log(`Found ${internships.length} internships to validate`)

    const validationResults: ValidationResult[] = []
    const deadLinkPatterns = [
      /position.*filled/i,
      /job.*closed/i,
      /no.*longer.*available/i,
      /expired/i,
      /not.*found/i,
      /404/i,
      /position.*removed/i,
      /this.*job.*is.*no.*longer.*active/i,
      /position.*has.*been.*filled/i
    ]

    for (const internship of internships) {
      console.log(`Validating: ${internship.company} - ${internship.role_title}`)
      
      let result: ValidationResult = {
        id: internship.id,
        application_link: internship.application_link,
        is_valid: false,
        status_code: 0,
        validation_message: '',
        checked_at: new Date().toISOString()
      }

      try {
        // Validate URL format first
        const url = new URL(internship.application_link)
        
        // Make HEAD request first (faster than GET)
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout
        
        let response = await fetch(internship.application_link, {
          method: 'HEAD',
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        })
        clearTimeout(timeoutId)

        result.status_code = response.status

        // If HEAD fails or returns error, try GET for more info
        if (response.status >= 400) {
          console.log(`HEAD request failed with ${response.status}, trying GET...`)
          
          const getController = new AbortController()
          const getTimeoutId = setTimeout(() => getController.abort(), 15000) // 15s timeout for GET
          
          const getResponse = await fetch(internship.application_link, {
            method: 'GET',
            signal: getController.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
          })
          clearTimeout(getTimeoutId)
          
          if (getResponse.status === 200) {
            // Check page content for dead link indicators
            const text = await getResponse.text()
            const hasDeadLinkPattern = deadLinkPatterns.some(pattern => 
              pattern.test(text.substring(0, 5000)) // Check first 5000 chars
            )
            
            if (hasDeadLinkPattern) {
              result.is_valid = false
              result.validation_message = 'Position appears to be closed'
            } else {
              result.is_valid = true
              result.validation_message = 'Active posting'
            }
          } else {
            result.is_valid = false
            result.validation_message = `HTTP ${getResponse.status}`
          }
        } else if (response.status === 200 || response.status === 302 || response.status === 301) {
          result.is_valid = true
          result.validation_message = 'Link accessible'
        } else {
          result.is_valid = false
          result.validation_message = `HTTP ${response.status}`
        }

      } catch (error) {
        console.error(`Validation failed for ${internship.id}:`, error.message)
        result.is_valid = false
        result.validation_message = error.message?.substring(0, 100) || 'Validation failed'
      }

      validationResults.push(result)

      // Update database with validation results
      const { error: updateError } = await supabase
        .from('internships')
        .update({
          link_valid: result.is_valid,
          last_validated_at: result.checked_at,
          validation_message: result.validation_message,
          is_active: result.is_valid // Auto-deactivate dead links
        })
        .eq('id', result.id)

      if (updateError) {
        console.error(`Failed to update internship ${result.id}:`, updateError)
      }

      // Add small delay to avoid overwhelming servers
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    // Clean up old, invalid postings (archive instead of delete)
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
    const { error: cleanupError } = await supabase
      .from('internships')
      .update({ 
        is_active: false, 
        archived_at: new Date().toISOString() 
      })
      .eq('link_valid', false)
      .lt('created_at', ninetyDaysAgo)

    if (cleanupError) {
      console.error('Cleanup error:', cleanupError)
    }

    const validCount = validationResults.filter(r => r.is_valid).length
    const invalidCount = validationResults.filter(r => !r.is_valid).length

    console.log(`Validation complete: ${validCount} valid, ${invalidCount} invalid`)

    return new Response(
      JSON.stringify({
        success: true,
        validated: validationResults.length,
        valid: validCount,
        invalid: invalidCount,
        results: validationResults
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Validation function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})