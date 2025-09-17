-- Fix function search path security issues by updating functions that don't have search_path set

-- Update match_jobs function to include search_path
CREATE OR REPLACE FUNCTION public.match_jobs(p_student_id uuid)
 RETURNS TABLE(id uuid, title text, company text, city text, description text, skills text[], application_url text, overlap numeric, missing_skills text[])
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  WITH st AS (
    SELECT
      COALESCE(skills, '{}') AS skills
    FROM public.students
    WHERE id = p_student_id
  )
  SELECT
    j.id,
    j.title,
    j.company,
    j.city,
    j.description,
    j.skills,
    j.application_url,
    calc.overlap,
    calc.missing_skills
  FROM public.jobs_for_app j
  CROSS JOIN st
  CROSS JOIN LATERAL (
    SELECT
      -- Jaccard overlap: |A∩B| / |A∪B|   (0..1)
      COALESCE((
        SELECT
          CASE WHEN u.cnt = 0 THEN 0
               ELSE i.cnt::numeric / u.cnt::numeric END
        FROM
          (SELECT count(*) AS cnt
             FROM ((SELECT unnest(j.skills) s)
                   UNION
                   (SELECT unnest(st.skills) s)) u) u,
          (SELECT count(*) AS cnt
             FROM ((SELECT unnest(j.skills) s)
                   INTERSECT
                   (SELECT unnest(st.skills) s)) i) i
      ), 0) AS overlap,
      -- Missing job skills to coach the student
      COALESCE((
        SELECT array_agg(s) FROM (
          (SELECT unnest(j.skills) s)
          EXCEPT
          (SELECT unnest(st.skills) s)
        ) ms
      ), '{}')::text[] AS missing_skills
  ) calc
  -- Only show active, open internships
  WHERE COALESCE(j.is_active, true)
    AND (j.opens_at IS NULL OR j.opens_at <= now())
    AND (j.closes_at IS NULL OR j.closes_at >= now())
  ORDER BY calc.overlap DESC NULLS LAST
  LIMIT 10;
$function$;