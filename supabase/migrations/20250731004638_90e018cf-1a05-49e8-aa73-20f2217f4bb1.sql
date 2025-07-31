-- 1. Add hire_score 0-100 if it doesn't exist
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS hire_score numeric;

-- 2. RLS: employers may read apps for their own jobs
-- prerequisite: jobs.employer_id = auth.uid()
CREATE POLICY IF NOT EXISTS "Employer can view own applicants"
  ON public.applications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.jobs j
      WHERE j.id = applications.job_id
        AND j.employer_id = auth.uid()
    )
  );