-- Drop and recreate function with new return columns
DROP FUNCTION IF EXISTS public.match_jobs(uuid);

-- Enable pg_trgm extension if not exists
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create the match_jobs function with smarter HireScore algorithm
CREATE OR REPLACE FUNCTION public.match_jobs(p_student_id uuid)
RETURNS TABLE (
  id uuid,
  title text,
  company text,
  city text,
  description text,
  skills text[],
  application_url text,
  overlap numeric,
  missing_skills text[],
  hire_score int
) 
LANGUAGE sql 
STABLE 
SET search_path = public
AS $$
  WITH st AS (
    SELECT
      COALESCE(skills, '{}')                                   AS skills,
      LEAST(COALESCE(gpa, 0), 4) / 4.0                        AS gpa_norm,
      CASE WHEN COALESCE(has_prev_intern, false) THEN 1 ELSE 0 END::numeric AS prev_int,
      COALESCE(project_depth, 0)::numeric                      AS project_depth
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
    calc.missing_skills,
    ROUND(100 * (
      0.50 * calc.overlap +
      0.20 * st.gpa_norm +
      0.20 * st.prev_int +
      0.10 * st.project_depth
    ))::int AS hire_score
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
  ORDER BY hire_score DESC NULLS LAST
  LIMIT 10;
$$;