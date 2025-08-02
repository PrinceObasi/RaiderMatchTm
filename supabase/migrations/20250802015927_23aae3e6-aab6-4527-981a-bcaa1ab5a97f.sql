-- Add constraint to ensure apply_url starts with https://
ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_apply_url_https_ck
  CHECK (apply_url ~* '^https://');