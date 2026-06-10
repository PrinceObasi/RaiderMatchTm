-- Fix the security definer view issue by removing the view and using proper RLS policies instead

-- Drop the problematic security definer view
DROP VIEW IF EXISTS public.student_application_view;

-- Instead, we'll use a security definer function to safely check employer access
-- Fix the search_path issue in the existing function
CREATE OR REPLACE FUNCTION public.can_view_applicant_data(application_job_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public, pg_temp'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.jobs j 
    WHERE j.id = application_job_id 
    AND j.employer_id = auth.uid()
  )
$$;

-- Create a function to get limited student info for employers (with fixed search_path)
CREATE OR REPLACE FUNCTION public.get_applicant_info(p_job_id uuid)
RETURNS TABLE (
  student_id uuid,
  name text,
  email text,
  major text,
  graduation_year integer,
  skills text[],
  application_id uuid,
  status text,
  hire_score numeric,
  applied_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public, pg_temp'
AS $$
  SELECT 
    s.id,
    s.name,
    s.email,
    s.major,
    s.graduation_year,
    s.skills,
    a.id,
    a.status,
    a.hire_score,
    a.applied_at
  FROM public.students s
  INNER JOIN public.applications a ON s.user_id = a.user_id
  INNER JOIN public.jobs j ON a.job_id = j.id
  WHERE j.id = p_job_id 
  AND j.employer_id = auth.uid();
$$;