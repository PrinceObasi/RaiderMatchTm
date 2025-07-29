import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.1";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client with service role key for admin access
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
if (!RESEND_API_KEY) throw new Error('Missing RESEND_API_KEY');
const resend = new Resend(RESEND_API_KEY);

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const { user_id, job_id } = payload.record;

    console.log('Processing notification for application:', { user_id, job_id });

    // Fetch job details with employer info and student info
    const { data: jobData, error: jobError } = await supabaseAdmin
      .from('jobs')
      .select(`
        title,
        company,
        employer_id
      `)
      .eq('id', job_id)
      .single();

    if (jobError || !jobData) {
      console.error('Error fetching job data:', jobError);
      return new Response(JSON.stringify({ error: 'Job not found' }), { 
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Fetch student info
    const { data: studentData, error: studentError } = await supabaseAdmin
      .from('students')
      .select('name, email')
      .eq('user_id', user_id)
      .single();

    if (studentError || !studentData) {
      console.error('Error fetching student data:', studentError);
      return new Response(JSON.stringify({ error: 'Student not found' }), { 
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // For now, we'll use a placeholder employer email since the employers table structure isn't fully defined
    // In a real implementation, you'd fetch from an employers table using jobData.employer_id
    const employerEmail = 'placeholder@ttu.edu'; // Replace with actual employer lookup

    const emailResult = await resend.emails.send({
      from: 'Raidermatch <onboarding@resend.dev>',
      to: employerEmail,
      subject: `New applicant for ${jobData.title}`,
      html: `
        <h2>New Application Notification</h2>
        <p>A TTU student has just applied for <strong>${jobData.title}</strong> at ${jobData.company}.</p>
        <p><strong>Student:</strong> ${studentData.name}</p>
        <p><strong>Email:</strong> ${studentData.email}</p>
        <p>Log in to your employer dashboard to view more details.</p>
      `
    });

    console.log('Email sent successfully:', emailResult);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error in notify_employer function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

serve(handler);