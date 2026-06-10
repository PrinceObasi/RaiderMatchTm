-- Add unique constraint to prevent duplicate applications from same user to same job
CREATE UNIQUE INDEX IF NOT EXISTS applications_user_job_uidx 
ON public.applications (user_id, job_id);