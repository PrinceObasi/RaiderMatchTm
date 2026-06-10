-- Add role validation to employer-facing RPC functions
-- Prevents privilege escalation where a student could create a job and view other students' PII

-- Replace can_view_applicant_data with role-validated version
CREATE OR REPLACE FUNCTION public.can_view_applicant_data(application_job_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Verify caller has employer role
  IF (auth.jwt() -> 'user_metadata' ->> 'role') IS DISTINCT FROM 'employer' THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.jobs j
    WHERE j.id = application_job_id
    AND j.employer_id = auth.uid()
  );
END;
$$;

-- Replace get_applicant_info with role-validated version
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
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Verify caller has employer role
  IF (auth.jwt() -> 'user_metadata' ->> 'role') IS DISTINCT FROM 'employer' THEN
    RAISE EXCEPTION 'Access denied: employer role required'
      USING ERRCODE = '42501'; -- insufficient_privilege
  END IF;

  RETURN QUERY
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
END;
$$;

-- Also add a CHECK constraint on hire_score while we're here
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hire_score_range'
  ) THEN
    ALTER TABLE public.applications
      ADD CONSTRAINT hire_score_range
      CHECK (hire_score IS NULL OR (hire_score >= 0 AND hire_score <= 100));
  END IF;
END;
$$;
