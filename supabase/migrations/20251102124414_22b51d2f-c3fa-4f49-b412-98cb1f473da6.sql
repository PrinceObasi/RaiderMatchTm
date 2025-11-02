-- Fix security definer issue by recreating view with security_invoker=on
-- This ensures the view respects RLS policies
DROP VIEW IF EXISTS public.active_internships;

CREATE VIEW public.active_internships
WITH (security_invoker=on)
AS
SELECT 
  id,
  company,
  role_title,
  location,
  tech_stack,
  work_mode,
  visa_sponsorship,
  application_link,
  direct_link,
  summary_text,
  description_text,
  date_posted,
  deadline,
  created_at,
  updated_at,
  enriched_at,
  salary_min,
  salary_max,
  remote_flag,
  source
FROM public.internships
WHERE is_active = true
ORDER BY date_posted DESC NULLS LAST, created_at DESC;