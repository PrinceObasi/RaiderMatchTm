-- Remove the overly permissive RLS policy that exposes sensitive student data
DROP POLICY IF EXISTS "Employers can view applicant basic info for their jobs" ON public.students;

-- Drop the existing function first, then recreate it without sensitive fields
DROP FUNCTION IF EXISTS public.get_applicant_info(uuid);

-- Recreate the function excluding sensitive fields like email and phone
CREATE OR REPLACE FUNCTION public.get_applicant_info(p_job_id uuid)
RETURNS TABLE(
  student_id uuid, 
  name text, 
  major text, 
  graduation_year integer, 
  skills text[], 
  application_id uuid, 
  status text, 
  hire_score numeric, 
  applied_at timestamp with time zone,
  is_international boolean,
  has_prev_intern boolean,
  gpa numeric
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public, pg_temp'
AS $function$
  SELECT 
    s.id,
    s.name,
    s.major,
    s.graduation_year,
    s.skills,
    a.id,
    a.status,
    a.hire_score,
    a.applied_at,
    s.is_international,
    s.has_prev_intern,
    s.gpa
  FROM public.students s
  INNER JOIN public.applications a ON s.user_id = a.user_id
  INNER JOIN public.jobs j ON a.job_id = j.id
  WHERE j.id = p_job_id 
  AND j.employer_id = auth.uid();
$function$;