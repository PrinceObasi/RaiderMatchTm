import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://tjahvypvfrjulnqmnhsh.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
    }

    // Create a client with the user's token for auth
    const userSupabase = createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY || '', {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    });

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await userSupabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const { tokens }: { tokens: string[] } = await request.json();

    if (!tokens || !Array.isArray(tokens)) {
      return NextResponse.json({ error: 'Invalid tokens array' }, { status: 400 });
    }

    // Call the database function to set profile keywords
    const { error } = await supabase.rpc('set_profile_keywords', {
      p_user_id: user.id,
      raw: tokens
    });

    if (error) {
      console.error('Error setting profile keywords:', error);
      return NextResponse.json({ error: 'Failed to update keywords' }, { status: 500 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error in profile keywords API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}