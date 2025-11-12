-- Create new matching function using tech_stack
CREATE OR REPLACE FUNCTION public.match_internships_for_user_v2(p_user_id uuid)
RETURNS TABLE(
  internship_id uuid,
  company text,
  role_title text,
  location text,
  overlap_count int,
  tech_overlap text[],
  date_posted date,
  work_mode text,
  summary_text text,
  application_link text,
  salary_min numeric,
  salary_max numeric,
  salary_currency text,
  visa_sponsorship visa_sponsorship_status
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH student_skills AS (
    SELECT ARRAY(
      SELECT DISTINCT lower(trim(unnest(resume_keywords)))
      FROM public.profiles
      WHERE user_id = p_user_id
    ) AS skills
  ),
  applied_internships AS (
    SELECT internship_id
    FROM public.applications
    WHERE user_id = p_user_id
      AND internship_id IS NOT NULL
  )
  SELECT
    i.id AS internship_id,
    i.company,
    i.role_title,
    i.location,
    CARDINALITY(
      ARRAY(
        SELECT unnest(ARRAY(SELECT lower(trim(unnest(i.tech_stack)))))
        INTERSECT
        SELECT unnest(s.skills)
      )
    )::int AS overlap_count,
    ARRAY(
      SELECT unnest(ARRAY(SELECT lower(trim(unnest(i.tech_stack)))))
      INTERSECT
      SELECT unnest(s.skills)
    ) AS tech_overlap,
    i.date_posted,
    i.work_mode,
    i.summary_text,
    i.application_link,
    i.salary_min,
    i.salary_max,
    i.salary_currency,
    i.visa_sponsorship
  FROM public.internships i
  CROSS JOIN student_skills s
  WHERE i.is_active = true
    AND i.tech_stack IS NOT NULL
    AND array_length(i.tech_stack, 1) > 0
    AND i.id NOT IN (SELECT internship_id FROM applied_internships)
    AND CARDINALITY(
      ARRAY(
        SELECT unnest(ARRAY(SELECT lower(trim(unnest(i.tech_stack)))))
        INTERSECT
        SELECT unnest(s.skills)
      )
    ) > 0
  ORDER BY overlap_count DESC, i.date_posted DESC NULLS LAST
  LIMIT 50;
$function$;

-- One-time sync: copy tech_stack to job_keywords
UPDATE public.internships
SET job_keywords = tech_stack
WHERE is_active = true
  AND tech_stack IS NOT NULL
  AND cardinality(tech_stack) > 0;

-- Create trigger function to keep job_keywords in sync with tech_stack
CREATE OR REPLACE FUNCTION public.sync_job_keywords_from_tech_stack()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.tech_stack IS NOT NULL AND array_length(NEW.tech_stack, 1) > 0 THEN
    NEW.job_keywords := NEW.tech_stack;
  END IF;
  RETURN NEW;
END;
$function$;

-- Create trigger to auto-sync job_keywords
CREATE TRIGGER sync_job_keywords_trigger
BEFORE INSERT OR UPDATE OF tech_stack ON public.internships
FOR EACH ROW
EXECUTE FUNCTION public.sync_job_keywords_from_tech_stack();