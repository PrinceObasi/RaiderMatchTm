import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeleteAccountRequest {
  userType: 'student' | 'employer';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Create regular client for user operations
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')!;
    
    // Get user from JWT token
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      console.error('Authentication error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { userType }: DeleteAccountRequest = await req.json();
    
    console.log(`Starting account deletion for user ${user.id} (${userType})`);

    // Delete user data based on type
    if (userType === 'student') {
      // Delete student applications first (due to foreign key constraints)
      const { error: appError } = await supabaseAdmin
        .from('applications')
        .delete()
        .eq('user_id', user.id);

      if (appError) {
        console.error('Error deleting applications:', appError);
        throw new Error('Failed to delete applications');
      }

      // Delete student profile
      const { error: studentError } = await supabaseAdmin
        .from('students')
        .delete()
        .eq('user_id', user.id);

      if (studentError) {
        console.error('Error deleting student profile:', studentError);
        throw new Error('Failed to delete student profile');
      }

      // Delete resume files from storage
      const { data: files, error: listError } = await supabaseAdmin
        .storage
        .from('resumes')
        .list(user.id);

      if (!listError && files && files.length > 0) {
        const filePaths = files.map(file => `${user.id}/${file.name}`);
        const { error: deleteFilesError } = await supabaseAdmin
          .storage
          .from('resumes')
          .remove(filePaths);

        if (deleteFilesError) {
          console.error('Error deleting resume files:', deleteFilesError);
        }
      }

    } else if (userType === 'employer') {
      // Delete applications for employer's jobs first
      const { data: jobs } = await supabaseAdmin
        .from('jobs')
        .select('id')
        .eq('employer_id', user.id);

      if (jobs && jobs.length > 0) {
        const jobIds = jobs.map(job => job.id);
        
        // Delete applications for these jobs
        for (const jobId of jobIds) {
          const { error: appError } = await supabaseAdmin
            .from('applications')
            .delete()
            .eq('job_id', jobId);

          if (appError) {
            console.error(`Error deleting applications for job ${jobId}:`, appError);
          }
        }
      }

      // Delete employer's jobs
      const { error: jobsError } = await supabaseAdmin
        .from('jobs')
        .delete()
        .eq('employer_id', user.id);

      if (jobsError) {
        console.error('Error deleting jobs:', jobsError);
        throw new Error('Failed to delete jobs');
      }
    }

    // Finally, delete the user account from auth
    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (deleteUserError) {
      console.error('Error deleting user account:', deleteUserError);
      throw new Error('Failed to delete user account');
    }

    console.log(`Successfully deleted account for user ${user.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Account deleted successfully' 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Delete account error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to delete account' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});