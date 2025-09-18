import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export async function OPTIONS() {
  return new Response(null, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    // Get internships that haven't been enriched
    const { data: internships, error: fetchError } = await supabase
      .from('internships')
      .select('id, application_link')
      .is('jd_summary', null)
      .not('application_link', 'is', null)
      .limit(10); // Process in small batches to avoid timeouts

    if (fetchError) {
      return NextResponse.json({ error: 'Failed to fetch internships' }, { status: 500, headers: corsHeaders });
    }

    if (!internships || internships.length === 0) {
      return NextResponse.json({ message: 'No internships to enrich' }, { headers: corsHeaders });
    }

    // Process each internship
    const results = [];
    const baseUrl = request.nextUrl.origin;
    
    for (const internship of internships) {
      try {
        const response = await fetch(`${baseUrl}/api/enrich`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: internship.id })
        });

        const result = await response.json();
        results.push({
          id: internship.id,
          success: response.ok,
          error: result.error || null
        });

        // Add small delay to avoid overwhelming external servers
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        results.push({
          id: internship.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    
    return NextResponse.json({
      processed: results.length,
      successful: successCount,
      failed: results.length - successCount,
      results
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Batch enrichment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}