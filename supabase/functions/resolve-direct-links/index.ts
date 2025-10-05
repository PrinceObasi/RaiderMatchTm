import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { ATS_REGEX, findATSMapping, extractDomain, isDirectATS } from './ats-map.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ResolveRequest {
  limit?: number
  sinceHours?: number
  dryRun?: boolean
}

interface ResolveResult {
  id: string
  company: string
  title: string
  simplify_url: string
  direct_url: string | null
  final_domain: string | null
  is_direct: boolean
  method: string
  error?: string
}

// Retry utility with exponential backoff
async function fetchWithRetry(url: string, maxRetries = 3): Promise<Response | null> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 12000) // Extended to 12s
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
        headers: { 'User-Agent': 'RaiderMatchBot/1.0' }
      })
      clearTimeout(timeout)
      return response
    } catch (error: any) {
      clearTimeout(timeout)
      if (attempt < maxRetries - 1) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000) // Exponential backoff: 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, delay))
        console.log(`Retry ${attempt + 1}/${maxRetries} for ${url} after ${delay}ms`)
      } else {
        console.error(`All retries failed for ${url}:`, error.message)
        return null
      }
    }
  }
  return null
}

// Resolve from Simplify URL by following redirects and parsing HTML
async function resolveFromSimplify(simplifyUrl: string): Promise<{ url: string | null; method: string; error?: string }> {
  try {
    const response = await fetchWithRetry(simplifyUrl)
    
    if (!response) {
      return { url: null, method: 'simplify_fetch_failed', error: 'All retries exhausted' }
    }
    
    if (!response.ok) {
      return { url: null, method: 'simplify_fetch_failed', error: `HTTP ${response.status}` }
    }
    
    // Check if redirect landed on ATS domain
    const redirectUrl = response.url
    if (redirectUrl !== simplifyUrl && isDirectATS(redirectUrl)) {
      return { url: redirectUrl, method: 'redirect_direct' }
    }
    
    // Parse HTML to find direct links
    const html = await response.text()
    
    // Try to extract from __NEXT_DATA__ (Next.js sites like Simplify)
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s)
    if (nextDataMatch) {
      try {
        const data = JSON.parse(nextDataMatch[1])
        const possibleUrls = JSON.stringify(data).match(/https?:\/\/[^\s"]+/g) || []
        for (const url of possibleUrls) {
          if (isDirectATS(url)) {
            return { url, method: 'nextjs_data' }
          }
        }
      } catch (e) {
        console.log('Failed to parse __NEXT_DATA__:', e)
      }
    }
    
    // Try to find links in HTML
    const linkMatches = html.matchAll(/<a[^>]*href=["']([^"']+)["'][^>]*>/gi)
    for (const match of linkMatches) {
      const href = match[1]
      if (href && isDirectATS(href)) {
        return { url: href, method: 'html_link' }
      }
    }
    
    // Try JSON-LD
    const jsonLdMatches = html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gis)
    for (const match of jsonLdMatches) {
      try {
        const data = JSON.parse(match[1])
        const urls = JSON.stringify(data).match(/https?:\/\/[^\s"]+/g) || []
        for (const url of urls) {
          if (isDirectATS(url)) {
            return { url, method: 'json_ld' }
          }
        }
      } catch (e) {
        console.log('Failed to parse JSON-LD:', e)
      }
    }
    
    return { url: null, method: 'no_ats_found' }
  } catch (error: any) {
    return { url: null, method: 'fetch_error', error: error.message }
  }
}

// Resolve via company ATS mapping
async function resolveViaCompanyATS(company: string, title: string, location: string): Promise<{ url: string | null; method: string; error?: string }> {
  const mapping = findATSMapping(company)
  
  if (mapping) {
    // For known companies, try to construct or search their careers page
    try {
      const response = await fetchWithRetry(mapping.baseUrl)
      
      if (!response || !response.ok) {
        return { url: null, method: 'ats_mapping_failed', error: response ? `HTTP ${response.status}` : 'Failed to fetch' }
      }
      
      const html = await response.text()
      
      // Try to find matching job posting
      const titleKeywords = title.toLowerCase().split(' ').filter(w => w.length > 3)
      const linkMatches = html.matchAll(/<a[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gis)
      
      let bestMatch: string | null = null
      let bestScore = 0
      
      for (const match of linkMatches) {
        const href = match[1]
        const linkText = match[2].toLowerCase()
        
        let score = 0
        for (const keyword of titleKeywords) {
          if (linkText.includes(keyword)) score++
        }
        
        if (score > bestScore && (linkText.includes('intern') || linkText.includes('internship'))) {
          bestScore = score
          // Make sure href is absolute
          bestMatch = href.startsWith('http') ? href : new URL(href, mapping.baseUrl).toString()
        }
      }
      
      if (bestMatch && isDirectATS(bestMatch)) {
        return { url: bestMatch, method: 'ats_mapping_match' }
      }
    } catch (error: any) {
      return { url: null, method: 'ats_mapping_error', error: error.message }
    }
  }
  
  // Fallback: DuckDuckGo HTML search with expanded ATS sites
  try {
    const searchQuery = `${company} ${title} internship careers site:greenhouse.io OR site:lever.co OR site:myworkdayjobs.com OR site:workdayjobs.com OR site:icims.com OR site:smartrecruiters.com OR site:ashbyhq.com`
    const encodedQuery = encodeURIComponent(searchQuery)
    
    const response = await fetchWithRetry(`https://html.duckduckgo.com/html/?q=${encodedQuery}`)
    
    if (!response || !response.ok) {
      return { url: null, method: 'search_failed', error: response ? `HTTP ${response.status}` : 'Failed to fetch' }
    }
    
    const html = await response.text()
    const resultMatches = html.matchAll(/href=["']([^"']+)["'][^>]*class=["']result/gi)
    
    for (const match of resultMatches) {
      const href = match[1]
      if (href && isDirectATS(href)) {
        return { url: href, method: 'search_fallback' }
      }
    }
    
    return { url: null, method: 'search_no_results' }
  } catch (error: any) {
    return { url: null, method: 'search_error', error: error.message }
  }
}

// Concurrency limiter
async function runWithConcurrencyLimit<T>(
  items: T[],
  fn: (item: T) => Promise<any>,
  limit: number
): Promise<any[]> {
  const results: any[] = []
  const executing: Promise<any>[] = []
  
  for (const item of items) {
    const promise = fn(item).then(result => {
      executing.splice(executing.indexOf(promise), 1)
      return result
    })
    
    results.push(promise)
    executing.push(promise)
    
    if (executing.length >= limit) {
      await Promise.race(executing)
    }
  }
  
  return Promise.allSettled(results)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  const errors: string[] = []
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    const body: ResolveRequest = await req.json().catch(() => ({}))
    const limit = body.limit || 200
    const sinceHours = body.sinceHours || 48
    const dryRun = body.dryRun || false
    
    console.log(`🔍 Resolving direct links: limit=${limit}, sinceHours=${sinceHours}, dryRun=${dryRun}`)
    
    // Check cache first for recently resolved URLs
    const { data: cacheData } = await supabase
      .from('direct_link_cache')
      .select('simplify_url, direct_url, final_domain, is_direct')
      .gte('seen_at', new Date(Date.now() - sinceHours * 60 * 60 * 1000).toISOString())
    
    const cache = new Map(cacheData?.map(c => [c.simplify_url, c]) || [])
    console.log(`📦 Cache has ${cache.size} entries`)
    
    // Get internships that need resolution
    const { data: internships, error: fetchError } = await supabase
      .from('internships')
      .select('id, company, role_title, location, application_link, simplify_url, direct_url, is_direct')
      .or('direct_url.is.null,is_direct.eq.false')
      .gte('created_at', new Date(Date.now() - sinceHours * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (fetchError) {
      errors.push(`Fetch error: ${fetchError.message}`)
      return new Response(
        JSON.stringify({ ok: false, error: fetchError.message, errors }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    if (!internships || internships.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, message: 'No internships need resolution', verified: 0, direct: 0, fallback: 0, errors: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    console.log(`📋 Found ${internships.length} internships to resolve`)
    
    const results: ResolveResult[] = []
    let verifiedCount = 0
    let directCount = 0
    let fallbackCount = 0
    
    // Process with concurrency limit
    const resolved = await runWithConcurrencyLimit(internships, async (internship) => {
      try {
        const simplifyUrl = internship.simplify_url || internship.application_link
        
        // Check cache first
        if (cache.has(simplifyUrl)) {
          const cached = cache.get(simplifyUrl)!
          return {
            id: internship.id,
            company: internship.company,
            title: internship.role_title,
            simplify_url: simplifyUrl,
            direct_url: cached.direct_url,
            final_domain: cached.final_domain,
            is_direct: cached.is_direct,
            method: 'cache'
          }
        }
        
        // Try Simplify resolution first
        let result = await resolveFromSimplify(simplifyUrl)
        
        // If no direct URL found, try company ATS mapping
        if (!result.url) {
          result = await resolveViaCompanyATS(internship.company, internship.role_title, internship.location)
        }
        
        const directUrl = result.url
        const finalDomain = directUrl ? extractDomain(directUrl) : null
        const isDirect = directUrl ? isDirectATS(directUrl) : false
        
        return {
          id: internship.id,
          company: internship.company,
          title: internship.role_title,
          simplify_url: simplifyUrl,
          direct_url: directUrl,
          final_domain: finalDomain,
          is_direct: isDirect,
          method: result.method,
          error: result.error
        }
      } catch (error: any) {
        if (errors.length < 20) {
          errors.push(`${internship.company}: ${error.message}`)
        }
        return null
      }
    }, 10)
    
    // Collect results
    for (const result of resolved) {
      if (result.status === 'fulfilled' && result.value) {
        const res = result.value
        results.push(res)
        
        if (res.direct_url) verifiedCount++
        if (res.is_direct) directCount++
        if (res.method.includes('fallback') || res.method.includes('search')) fallbackCount++
      }
    }
    
    // Log first 5 resolutions
    console.log(`\n✅ Sample resolutions:`)
    results.slice(0, 5).forEach(r => {
      console.log(`  ${r.company} - ${r.title}`)
      console.log(`    → ${r.direct_url || 'NONE'}`)
      console.log(`    Method: ${r.method}`)
    })
    
    // Update database unless dry run
    if (!dryRun && results.length > 0) {
      for (const res of results) {
        // Update internship
        const { error: updateError } = await supabase
          .from('internships')
          .update({
            simplify_url: res.simplify_url,
            direct_url: res.direct_url,
            final_domain: res.final_domain,
            is_direct: res.is_direct,
            last_verified_at: new Date().toISOString()
          })
          .eq('id', res.id)
        
        if (updateError && errors.length < 20) {
          errors.push(`Update error for ${res.company}: ${updateError.message}`)
        }
        
        // Update cache
        if (res.direct_url) {
          await supabase
            .from('direct_link_cache')
            .upsert({
              simplify_url: res.simplify_url,
              direct_url: res.direct_url,
              final_domain: res.final_domain,
              is_direct: res.is_direct,
              seen_at: new Date().toISOString()
            })
        }
      }
      
      console.log(`✅ Updated ${results.length} internships`)
    }
    
    // Calculate coverage by company
    const companyCoverage = results.reduce((acc, r) => {
      if (!acc[r.company]) {
        acc[r.company] = { total: 0, direct: 0 }
      }
      acc[r.company].total++
      if (r.is_direct) acc[r.company].direct++
      return acc
    }, {} as Record<string, { total: number; direct: number }>)
    
    const topCompanies = Object.entries(companyCoverage)
      .map(([company, stats]) => ({
        company,
        total: stats.total,
        direct: stats.direct,
        coverage: stats.total > 0 ? (stats.direct / stats.total * 100).toFixed(1) : '0.0'
      }))
      .sort((a, b) => b.direct - a.direct)
      .slice(0, 10)
    
    return new Response(
      JSON.stringify({
        ok: true,
        verified: verifiedCount,
        direct: directCount,
        fallback: fallbackCount,
        total: results.length,
        dryRun,
        topCompanies,
        errors: errors.slice(0, 20)
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error: any) {
    console.error('❌ Unexpected error:', error)
    const errMsg = error.message || 'Unknown error'
    return new Response(
      JSON.stringify({ 
        ok: false, 
        error: errMsg,
        errors: [...errors.slice(0, 19), errMsg]
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
