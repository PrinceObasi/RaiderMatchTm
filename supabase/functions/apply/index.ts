import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple in-memory rate limiting store
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Cleanup expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

function checkRateLimit(userId: string, ip: string): boolean {
  const key = `apply:${userId || ip}`;
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  
  const current = rateLimitStore.get(key);
  
  if (!current || now > current.resetTime) {
    // First request or window expired
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (current.count >= 5) {
    return false; // Rate limit exceeded
  }
  
  current.count++;
  return true;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get user from JWT
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get client IP
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';

    // Check rate limit
    if (!checkRateLimit(user.id, ip)) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please wait before applying again.' }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse request body
    const { job_id, hire_score, apply_url } = await req.json();

    if (!job_id) {
      return new Response(
        JSON.stringify({ error: 'Missing job_id' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate job exists and is active
    const { data: job, error: jobError } = await supabaseClient
      .from('jobs')
      .select('id, apply_url, is_active')
      .eq('id', job_id)
      .eq('is_active', true)
      .single();

    if (jobError || !job) {
      return new Response(
        JSON.stringify({ error: 'Job not found or inactive' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if user already applied
    const { data: existingApplication } = await supabaseClient
      .from('applications')
      .select('id')
      .eq('user_id', user.id)
      .eq('job_id', job_id)
      .single();

    if (existingApplication) {
      return new Response(
        JSON.stringify({ error: 'Already applied to this job' }),
        { 
          status: 409, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Insert application
    const { error: insertError } = await supabaseClient
      .from('applications')
      .insert({
        user_id: user.id,
        job_id: job_id,
        hire_score: hire_score || null,
        status: 'applied'
      });

    if (insertError) {
      console.error('Insert error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to record application' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Return success with the apply URL for frontend to open
    return new Response(
      JSON.stringify({ 
        success: true, 
        apply_url: apply_url || job.apply_url,
        message: 'Application recorded successfully'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Apply function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});