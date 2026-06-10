-- Remove duplicate applications, keeping only the first one for each user-job combination
DELETE FROM public.applications a1 
USING public.applications a2 
WHERE a1.id > a2.id 
  AND a1.user_id = a2.user_id 
  AND a1.job_id = a2.job_id;

-- One application per student per job
ALTER TABLE public.applications
  ADD CONSTRAINT applications_unique_student_job
  UNIQUE (user_id, job_id);