import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1'

const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGIN') || '').split(',').map(o => o.trim()).filter(Boolean);

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || '';
  const isAllowed = ALLOWED_ORIGINS.length > 0 && ALLOWED_ORIGINS.includes(origin);
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : '',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  };
}

// Company logo mappings for common companies
const companyLogoMap: Record<string, string> = {
  'Google': 'https://logo.clearbit.com/google.com',
  'Microsoft': 'https://logo.clearbit.com/microsoft.com',
  'Apple': 'https://logo.clearbit.com/apple.com',
  'Amazon': 'https://logo.clearbit.com/amazon.com',
  'Meta': 'https://logo.clearbit.com/meta.com',
  'Netflix': 'https://logo.clearbit.com/netflix.com',
  'Spotify': 'https://logo.clearbit.com/spotify.com',
  'Uber': 'https://logo.clearbit.com/uber.com',
  'Airbnb': 'https://logo.clearbit.com/airbnb.com',
  'Tesla': 'https://logo.clearbit.com/tesla.com',
  'Stripe': 'https://logo.clearbit.com/stripe.com',
  'Shopify': 'https://logo.clearbit.com/shopify.com',
  'Salesforce': 'https://logo.clearbit.com/salesforce.com',
  'LinkedIn': 'https://logo.clearbit.com/linkedin.com',
  'Twitter': 'https://logo.clearbit.com/twitter.com',
  'GitHub': 'https://logo.clearbit.com/github.com',
  'Adobe': 'https://logo.clearbit.com/adobe.com',
  'Intel': 'https://logo.clearbit.com/intel.com',
  'NVIDIA': 'https://logo.clearbit.com/nvidia.com',
  'Oracle': 'https://logo.clearbit.com/oracle.com',
  'IBM': 'https://logo.clearbit.com/ibm.com',
  'Cisco': 'https://logo.clearbit.com/cisco.com',
  'VMware': 'https://logo.clearbit.com/vmware.com',
  'ServiceNow': 'https://logo.clearbit.com/servicenow.com',
  'Workday': 'https://logo.clearbit.com/workday.com',
  'Atlassian': 'https://logo.clearbit.com/atlassian.com',
  'Slack': 'https://logo.clearbit.com/slack.com',
  'Zoom': 'https://logo.clearbit.com/zoom.us',
  'Dropbox': 'https://logo.clearbit.com/dropbox.com',
  'Square': 'https://logo.clearbit.com/squareup.com',
  'PayPal': 'https://logo.clearbit.com/paypal.com',
  'eBay': 'https://logo.clearbit.com/ebay.com',
  'Lyft': 'https://logo.clearbit.com/lyft.com',
  'DoorDash': 'https://logo.clearbit.com/doordash.com',
  'Instacart': 'https://logo.clearbit.com/instacart.com',
  'Coinbase': 'https://logo.clearbit.com/coinbase.com',
  'Robinhood': 'https://logo.clearbit.com/robinhood.com',
  'Twilio': 'https://logo.clearbit.com/twilio.com',
  'MongoDB': 'https://logo.clearbit.com/mongodb.com',
  'Redis': 'https://logo.clearbit.com/redis.com',
  'Databricks': 'https://logo.clearbit.com/databricks.com',
  'Snowflake': 'https://logo.clearbit.com/snowflake.com'
};

function getCompanyLogoUrl(companyName: string): string | null {
  if (!companyName) return null;
  
  // Check direct mapping first
  if (companyLogoMap[companyName]) {
    return companyLogoMap[companyName];
  }
  
  // Generate from company name
  const cleanName = companyName.toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
  
  return `https://logo.clearbit.com/${cleanName}.com`;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

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

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all jobs without logos
    const { data: jobs, error: jobsError } = await supabaseClient
      .from('jobs')
      .select('id, company, company_logo')
      .is('company_logo', null);

    if (jobsError) {
      console.error('Error fetching jobs:', jobsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch jobs' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let updatedCount = 0;
    const updates = [];

    for (const job of jobs || []) {
      const logoUrl = getCompanyLogoUrl(job.company);
      if (logoUrl) {
        updates.push({
          id: job.id,
          company_logo: logoUrl
        });
      }
    }

    // Batch update logos
    if (updates.length > 0) {
      for (const update of updates) {
        const { error: updateError } = await supabaseClient
          .from('jobs')
          .update({ company_logo: update.company_logo })
          .eq('id', update.id);

        if (!updateError) {
          updatedCount++;
        } else {
          console.error(`Failed to update job ${update.id}:`, updateError);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        message: `Successfully updated ${updatedCount} company logos`,
        totalJobs: jobs?.length || 0,
        updatedJobs: updatedCount
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});