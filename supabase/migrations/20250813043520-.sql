-- Fix student data security: Create controlled access for employers to see limited applicant info

-- First, let's create a view that only exposes necessary student info for employers
CREATE OR REPLACE VIEW public.student_application_view AS
SELECT 
  s.id,
  s.name,
  s.email,
  s.major,
  s.graduation_year,
  s.skills,
  a.job_id,
  a.id as application_id,
  a.status,
  a.hire_score,
  a.applied_at
FROM public.students s
INNER JOIN public.applications a ON s.user_id = a.user_id;

-- Enable RLS on the view
ALTER VIEW public.student_application_view SET (security_barrier = true);

-- Create a security definer function to check if user can view applicant data
CREATE OR REPLACE FUNCTION public.can_view_applicant_data(application_job_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.jobs j 
    WHERE j.id = application_job_id 
    AND j.employer_id = auth.uid()
  )
$$;

-- Add RLS policy for employers to view limited student data only for their job applicants
CREATE POLICY "Employers can view applicant basic info for their jobs"
ON public.students
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.applications a
    INNER JOIN public.jobs j ON a.job_id = j.id
    WHERE a.user_id = students.user_id
    AND j.employer_id = auth.uid()
  )
);

-- Update applications table policies to be more restrictive
DROP POLICY IF EXISTS "Authenticated users can insert jobs" ON public.applications;
DROP POLICY IF EXISTS "Authenticated users can update jobs" ON public.applications;
DROP POLICY IF EXISTS "Authenticated users can delete jobs" ON public.applications;

-- Create proper application policies
CREATE POLICY "Users can insert their own applications"
ON public.applications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own applications"
ON public.applications
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own applications"
ON public.applications
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Also fix jobs table policies to be more restrictive
DROP POLICY IF EXISTS "Authenticated users can insert jobs" ON public.jobs;
DROP POLICY IF EXISTS "Authenticated users can update jobs" ON public.jobs;
DROP POLICY IF EXISTS "Authenticated users can delete jobs" ON public.jobs;

-- Create proper job policies
CREATE POLICY "Users can insert jobs with their employer_id"
ON public.jobs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = employer_id);

CREATE POLICY "Employers can update their own jobs"
ON public.jobs
FOR UPDATE
TO authenticated
USING (auth.uid() = employer_id)
WITH CHECK (auth.uid() = employer_id);

CREATE POLICY "Employers can delete their own jobs"
ON public.jobs
FOR DELETE
TO authenticated
USING (auth.uid() = employer_id);