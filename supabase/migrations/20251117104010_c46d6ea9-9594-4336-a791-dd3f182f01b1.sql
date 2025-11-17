-- Update the matching function to use students.skills (from Profile → Technical Skills)
-- instead of students.tech_stack or resume keywords
CREATE OR REPLACE FUNCTION public.match_internships_for_user(p_user_id uuid, p_limit integer DEFAULT 50)
RETURNS TABLE(
  id uuid,
  company text,
  role_title text,
  location text,
  work_mode text,
  summary_text text,
  tech_stack text[],
  match_count integer,
  matched_tags text[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  -- Get the user's explicitly selected skills from their profile
  WITH user_skills AS (
    SELECT ARRAY(
      SELECT DISTINCT lower(trim(unnest(skills)))
      FROM public.students
      WHERE user_id = p_user_id
        AND skills IS NOT NULL
        AND array_length(skills, 1) > 0
    ) AS skills
  ),
  -- Find internships that match those skills
  matches AS (
    SELECT
      i.id,
      i.company,
      i.role_title,
      i.location,
      i.work_mode,
      i.summary_text,
      i.tech_stack,
      i.date_posted,
      CARDINALITY(
        ARRAY(
          SELECT unnest(ARRAY(SELECT lower(trim(unnest(i.tech_stack)))))
          INTERSECT
          SELECT unnest(u.skills)
        )
      )::int AS match_count,
      ARRAY(
        SELECT unnest(ARRAY(SELECT lower(trim(unnest(i.tech_stack)))))
        INTERSECT
        SELECT unnest(u.skills)
      ) AS matched_tags
    FROM public.internships i
    CROSS JOIN user_skills u
    WHERE i.is_active = true
      AND i.tech_stack IS NOT NULL
      AND array_length(i.tech_stack, 1) > 0
      -- Only include if there's at least one matching skill
      AND CARDINALITY(
        ARRAY(
          SELECT unnest(ARRAY(SELECT lower(trim(unnest(i.tech_stack)))))
          INTERSECT
          SELECT unnest(u.skills)
        )
      ) > 0
  )
  SELECT 
    id,
    company,
    role_title,
    location,
    work_mode,
    summary_text,
    tech_stack,
    match_count,
    matched_tags
  FROM matches
  ORDER BY match_count DESC, date_posted DESC NULLS LAST
  LIMIT p_limit;
$function$;