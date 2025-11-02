-- Create a view that shows only active internships
CREATE OR REPLACE VIEW public.active_internships AS
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

-- Grant access to authenticated users
GRANT SELECT ON public.active_internships TO authenticated;
GRANT SELECT ON public.active_internships TO anon;