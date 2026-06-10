-- Add foreign key constraints
ALTER TABLE public.applications
  ADD CONSTRAINT apps_user_fk FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD CONSTRAINT apps_job_fk FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;

ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_employer_fk FOREIGN KEY (employer_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Set default values and constraints
ALTER TABLE public.jobs ALTER COLUMN is_active SET DEFAULT true;
ALTER TABLE public.applications ALTER COLUMN status SET DEFAULT 'applied';

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_jobs_live ON public.jobs(is_active, opens_at, closes_at);
CREATE INDEX IF NOT EXISTS idx_jobs_employer ON public.jobs(employer_id);
CREATE INDEX IF NOT EXISTS idx_apps_user ON public.applications(user_id);
CREATE INDEX IF NOT EXISTS idx_apps_job ON public.applications(job_id);
CREATE INDEX IF NOT EXISTS idx_jobs_skills ON public.jobs USING GIN(skills);
CREATE INDEX IF NOT EXISTS idx_students_user ON public.students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_skills ON public.students USING GIN(skills);