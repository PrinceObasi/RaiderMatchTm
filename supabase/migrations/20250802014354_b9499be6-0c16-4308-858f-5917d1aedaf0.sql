-- One application per student per job
ALTER TABLE public.applications
  ADD CONSTRAINT applications_unique_student_job
  UNIQUE (user_id, job_id);