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
    
    let applicationData;
    let hireScore = 0;
    
    // Handle direct function calls or trigger calls
    if (payload.record) {
      // Called from database trigger
      const { user_id, job_id, hire_score } = payload.record;
      hireScore = hire_score || 0;
      
      console.log('Processing notification for application:', { user_id, job_id, hire_score });

      // Fetch comprehensive application data
      const { data: appData, error: appError } = await supabaseAdmin
        .from('applications')
        .select(`
          id,
          hire_score,
          jobs!inner(
            title,
            company,
            employer_id
          ),
          students!inner(
            name,
            email
          )
        `)
        .eq('user_id', user_id)
        .eq('job_id', job_id)
        .order('applied_at', { ascending: false })
        .limit(1)
        .single();

      if (appError || !appData) {
        console.error('Error fetching application data:', appError);
        return new Response(JSON.stringify({ error: 'Application data not found' }), { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      applicationData = appData;
    } else if (payload.studentName && payload.employerEmail) {
      // Direct function call with data
      applicationData = payload;
      hireScore = payload.hireScore || 0;
    } else {
      return new Response(JSON.stringify({ error: 'Invalid payload format' }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get employer email from auth.users using employer_id
    let employerEmail = '';
    if (applicationData.employerEmail) {
      employerEmail = applicationData.employerEmail;
    } else if (applicationData.jobs?.employer_id) {
      const { data: employerAuth, error: employerError } = await supabaseAdmin.auth.admin.getUserById(
        applicationData.jobs.employer_id
      );

      if (employerError || !employerAuth.user?.email) {
        console.error('Error fetching employer email:', employerError);
        // Fallback for development - you might want to handle this differently
        employerEmail = 'employer@ttu.edu';
      } else {
        employerEmail = employerAuth.user.email;
      }
    }

    // Only send email if we have a valid employer email
    if (!employerEmail) {
      console.error('No employer email found');
      return new Response(JSON.stringify({ error: 'Employer email not found' }), { 
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const studentName = applicationData.students?.name || applicationData.studentName || 'Unknown Student';
    const studentEmail = applicationData.students?.email || applicationData.studentEmail || '';
    const jobTitle = applicationData.jobs?.title || applicationData.jobTitle || 'Unknown Position';
    const company = applicationData.jobs?.company || applicationData.company || 'Unknown Company';

    // Enhanced email with HireScore information
    const emailResult = await resend.emails.send({
      from: 'TTU Job Board <notifications@resend.dev>',
      to: [employerEmail],
      subject: `High-Scoring Application Alert: ${jobTitle} (Score: ${hireScore})`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
          <div style="background: linear-gradient(135deg, #dc2626, #991b1b); color: white; padding: 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">🎯 High-Scoring Candidate Alert!</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">TTU Job Board</p>
          </div>

          <div style="padding: 30px;">
            <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; margin-bottom: 25px;">
              <h2 style="margin: 0 0 10px 0; color: #dc2626; font-size: 24px;">HireScore: ${hireScore}/100</h2>
              <p style="margin: 0; color: #374151;">This candidate scored in the top tier based on our matching algorithm!</p>
            </div>

            <h3 style="color: #374151; margin-bottom: 20px;">Application Details</h3>
            
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px 0; font-weight: bold; color: #374151; width: 120px;">Position:</td>
                <td style="padding: 12px 0; color: #6b7280;">${jobTitle}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px 0; font-weight: bold; color: #374151;">Company:</td>
                <td style="padding: 12px 0; color: #6b7280;">${company}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px 0; font-weight: bold; color: #374151;">Applicant:</td>
                <td style="padding: 12px 0; color: #6b7280;">${studentName}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; font-weight: bold; color: #374151;">Email:</td>
                <td style="padding: 12px 0; color: #6b7280;">${studentEmail}</td>
              </tr>
            </table>

            <div style="background: #eff6ff; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
              <h4 style="margin: 0 0 10px 0; color: #1d4ed8;">💡 Why This Candidate Scored High</h4>
              <p style="margin: 0; color: #1e40af; line-height: 1.5;">
                Our HireScore algorithm evaluates candidates based on GPA, previous internship experience, 
                GitHub project depth, skill alignment, and other key factors that predict job success.
              </p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="https://tjahvypvfrjulnqmnhsh.supabase.co" 
                 style="background: #dc2626; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px;">
                View Full Application →
              </a>
            </div>

            <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; color: #6b7280; font-size: 14px;">
              <p style="margin: 0;">
                <strong>Note:</strong> You're receiving this notification because this candidate achieved a HireScore of ${hireScore} or higher. 
                Only top-scoring candidates trigger these alerts to help you identify the best talent quickly.
              </p>
            </div>
          </div>
        </div>
      `
    });

    console.log('Enhanced email sent successfully:', emailResult);

    return new Response(JSON.stringify({ 
      success: true, 
      emailId: emailResult.data?.id,
      hireScore,
      recipientEmail: employerEmail
    }), {
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