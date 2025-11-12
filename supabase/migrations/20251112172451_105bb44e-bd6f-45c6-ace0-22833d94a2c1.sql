-- Drop and recreate matching function with tech_stack included
DROP FUNCTION IF EXISTS public.match_internships_for_user_v2(uuid);

CREATE FUNCTION public.match_internships_for_user_v2(p_user_id uuid)
RETURNS TABLE(
  internship_id uuid,
  company text,
  role_title text,
  location text,
  overlap_count int,
  tech_overlap text[],
  tech_stack text[],
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
    i.tech_stack,
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