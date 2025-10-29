import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidationResult {
  id: string;
  status: 'alive' | 'dead' | 'unknown';
  http_status: number | null;
  final_url: string;
  reason: string;
}

const ATS_DEAD_PATTERNS = {
  greenhouse: [
    /this job is no longer available/i,
    /we can't find that job/i,
    /job posting.*not found/i
  ],
  lever: [
    /this job posting is no longer available/i,
    /job not found/i,
    /posting.*no longer available/i
  ],
  workday: [
    /job no longer available/i,
    /no longer accepting applications/i,
    /job you are trying to access has expired/i,
    /this job opening is closed/i
  ],
  icims: [
    /requisition has been closed/i,
    /no longer posted/i,
    /this position is no longer available/i
  ],
  general: [
    /position.*filled/i,
    /job.*closed/i,
    /no.*longer.*available/i,
    /expired/i,
    /not.*found/i,
    /404/i,
    /position.*removed/i,
    /application.*closed/i,
    /deadline.*passed/i
  ]
};

async function checkLinkWithFetch(url: string): Promise<ValidationResult> {
  const result: ValidationResult = {
    id: '',
    status: 'unknown',
    http_status: null,
    final_url: url,
    reason: ''
  };

  try {
    // Validate URL format
    new URL(url);
    
    // Try HEAD request first
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    let response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    clearTimeout(timeoutId);

    result.http_status = response.status;
    result.final_url = response.url;

    // Check for definitive dead status codes
    if (response.status === 404 || response.status === 410) {
      result.status = 'dead';
      result.reason = `HTTP ${response.status}`;
      return result;
    }

    // If HEAD fails or returns error, try GET for content analysis
    if (response.status >= 400) {
      const controller2 = new AbortController();
      const timeoutId2 = setTimeout(() => controller2.abort(), 8000);
      
      const getResponse = await fetch(url, {
        method: 'GET',
        signal: controller2.signal,
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      clearTimeout(timeoutId2);
      
      result.http_status = getResponse.status;
      result.final_url = getResponse.url;
      
      if (getResponse.status === 404 || getResponse.status === 410) {
        result.status = 'dead';
        result.reason = `HTTP ${getResponse.status}`;
        return result;
      }

      // Check page content
      const text = await getResponse.text();
      const contentCheck = checkContentForDeadPatterns(text);
      if (contentCheck.isDead) {
        result.status = 'dead';
        result.reason = contentCheck.reason;
        return result;
      }
    }

    // Success status codes
    if (response.status >= 200 && response.status < 400) {
      // For successful responses, do a GET to check content
      const controller3 = new AbortController();
      const timeoutId3 = setTimeout(() => controller3.abort(), 8000);
      
      const getResponse = await fetch(url, {
        method: 'GET',
        signal: controller3.signal,
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      clearTimeout(timeoutId3);

      const text = await getResponse.text();
      const contentCheck = checkContentForDeadPatterns(text);
      
      if (contentCheck.isDead) {
        result.status = 'dead';
        result.reason = contentCheck.reason;
        return result;
      }

      // Check for apply button/CTA
      if (hasApplyCTA(text)) {
        result.status = 'alive';
        result.reason = 'Active posting with apply CTA';
        return result;
      }

      // If no dead patterns but also no clear CTA, mark as unknown
      result.status = 'unknown';
      result.reason = 'No clear apply CTA found';
      return result;
    }

  } catch (error) {
    result.status = 'unknown';
    result.reason = (error as Error).message?.includes('aborted') 
      ? 'Timeout' 
      : ((error as Error).message || 'Validation failed');
  }

  return result;
}

function checkContentForDeadPatterns(content: string): { isDead: boolean; reason: string } {
  const sampleContent = content.substring(0, 10000); // Check first 10KB
  
  // Check all ATS patterns
  for (const [atsName, patterns] of Object.entries(ATS_DEAD_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(sampleContent)) {
        return { 
          isDead: true, 
          reason: `Dead (${atsName} pattern: "${pattern.source.substring(0, 50)}")` 
        };
      }
    }
  }

  // Check title for "Not Found"
  const titleMatch = sampleContent.match(/<title[^>]*>(.*?)<\/title>/i);
  if (titleMatch && /not\s*found|404|error/i.test(titleMatch[1])) {
    return { isDead: true, reason: 'Dead (404 in title)' };
  }

  return { isDead: false, reason: '' };
}

function hasApplyCTA(content: string): boolean {
  const applyPatterns = [
    /apply\s*now/i,
    /submit\s*application/i,
    /start\s*application/i,
    /apply\s*for\s*this/i,
    /<button[^>]*>\s*apply/i,
    /class="[^"]*apply-button/i
  ];

  return applyPatterns.some(pattern => pattern.test(content));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { batch_size = 50 } = await req.json().catch(() => ({ batch_size: 50 }));

    console.log(`Starting dead-link sweep (batch size: ${batch_size})...`);

    // Fetch active internships that haven't been validated recently
    const { data: internships, error } = await supabase
      .from('internships')
      .select('id, application_link, company, role_title')
      .eq('is_active', true)
      .not('application_link', 'is', null)
      .or('last_validated_at.is.null,last_validated_at.lt.now() - interval \'7 days\'')
      .limit(batch_size);

    if (error) {
      console.error('Error fetching internships:', error);
      throw error;
    }

    console.log(`Found ${internships?.length || 0} internships to validate`);

    const results: ValidationResult[] = [];
    let deadCount = 0;
    let aliveCount = 0;
    let unknownCount = 0;

    for (const internship of internships || []) {
      console.log(`Checking ${internship.company} - ${internship.role_title}`);
      
      const result = await checkLinkWithFetch(internship.application_link);
      result.id = internship.id;
      results.push(result);

      // Update database based on result
      const updateData: any = {
        last_validated_at: new Date().toISOString(),
        link_valid: result.status === 'alive',
        validation_message: result.reason
      };

      if (result.status === 'dead') {
        updateData.is_active = false;
        updateData.archived_at = new Date().toISOString();
        deadCount++;
      } else if (result.status === 'alive') {
        aliveCount++;
      } else {
        unknownCount++;
      }

      const { error: updateError } = await supabase
        .from('internships')
        .update(updateData)
        .eq('id', internship.id);

      if (updateError) {
        console.error(`Failed to update internship ${internship.id}:`, updateError);
      }

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`Sweep complete: ${aliveCount} alive, ${deadCount} dead, ${unknownCount} unknown`);

    return new Response(
      JSON.stringify({
        success: true,
        validated: results.length,
        alive: aliveCount,
        dead: deadCount,
        unknown: unknownCount,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Sweep function error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
