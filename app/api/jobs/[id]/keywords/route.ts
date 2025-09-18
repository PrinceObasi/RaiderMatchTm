import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://tjahvypvfrjulnqmnhsh.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Parse request body
    const { tokens }: { tokens: string[] } = await request.json();

    if (!tokens || !Array.isArray(tokens)) {
      return NextResponse.json({ error: 'Invalid tokens array' }, { status: 400 });
    }

    // Validate job ID
    if (!params.id) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    // Call the database function to set job keywords
    const { error } = await supabase.rpc('set_job_keywords', {
      p_job_id: params.id,
      raw: tokens
    });

    if (error) {
      console.error('Error setting job keywords:', error);
      return NextResponse.json({ error: 'Failed to update keywords' }, { status: 500 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error in job keywords API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}