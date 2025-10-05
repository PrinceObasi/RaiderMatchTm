import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key for unrestricted access
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse request body
    const { internship_id, application_url, user_agent } = await req.json();

    if (!internship_id || !application_url) {
      return new Response(
        JSON.stringify({ error: 'Missing internship_id or application_url' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Try to get user from Authorization header if provided
    let user_id = null;
    const authHeader = req.headers.get('Authorization');
    
    if (authHeader) {
      try {
        const userClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_ANON_KEY') ?? '',
          {
            global: {
              headers: { Authorization: authHeader },
            },
          }
        );
        
        const { data: { user } } = await userClient.auth.getUser();
        if (user) {
          user_id = user.id;
        }
      } catch (error) {
        console.log('Could not extract user from auth header:', error);
        // Continue without user_id - it's optional
      }
    }

    // Insert application event
    const { error: insertError } = await supabaseClient
      .from('application_events')
      .insert({
        internship_id,
        user_id,
        application_url,
        user_agent,
      });

    if (insertError) {
      console.error('Insert application event error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to log application event' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Successfully logged application event for internship ${internship_id}, user: ${user_id || 'anonymous'}`);

    // Return 204 No Content as requested
    return new Response(null, { 
      status: 204, 
      headers: corsHeaders 
    });

  } catch (error) {
    console.error('Apply-log function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});