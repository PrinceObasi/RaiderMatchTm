-- Update match_internships_for_user to exclude internships user has already applied to
CREATE OR REPLACE FUNCTION public.match_internships_for_user(
  p_user_id uuid, 
  p_limit integer DEFAULT 20, 
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid, 
  company text, 
  role_title text, 
  location text, 
  tech_stack text[], 
  visa_sponsorship visa_sponsorship_status, 
  application_link text, 
  direct_link text, 
  link_type text, 
  date_posted date, 
  deadline date, 
  work_mode text, 
  summary_text text, 
  description_text text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH me AS (
    SELECT coalesce(resume_keywords,'{}'::text[]) AS kw
    FROM public.profiles WHERE user_id = p_user_id
  ),
  scored AS (
    SELECT i.*,
           cardinality( (SELECT ARRAY(
              SELECT DISTINCT x FROM unnest(coalesce(i.job_keywords, '{}'::text[])) x
              INTERSECT
              SELECT DISTINCT y FROM unnest((SELECT kw FROM me)) y
           )) ) AS overlap
    FROM public.internships i
    WHERE coalesce(i.is_texas, true) = true
      -- Exclude internships the user has already applied to
      AND NOT EXISTS (
        SELECT 1 FROM public.applications a 
        WHERE a.internship_id = i.id 
        AND a.user_id = p_user_id
      )
  )
  SELECT s.id,
         s.company,
         s.role_title,
         s.location,
         s.tech_stack,
         s.visa_sponsorship,
         s.application_link,
         s.direct_link,
         s.link_type,
         s.date_posted,
         s.deadline,
         s.work_mode,
         s.summary_text,
         s.description_text
  FROM scored s
  ORDER BY s.overlap DESC, coalesce(s.date_posted, now()::date) DESC
  LIMIT p_limit OFFSET p_offset;
$function$;

-- Update search_internships to exclude internships user has already applied to
CREATE OR REPLACE FUNCTION public.search_internships(
  q text DEFAULT NULL::text, 
  locations text[] DEFAULT NULL::text[], 
  visa text DEFAULT 'any'::text, 
  stacks text[] DEFAULT NULL::text[], 
  user_gpa numeric DEFAULT NULL::numeric, 
  respect_gpa boolean DEFAULT false, 
  limit_count integer DEFAULT 20, 
  offset_count integer DEFAULT 0
)
RETURNS SETOF internships
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
SELECT *
FROM internships i
WHERE
  -- keyword across company, role, and any tech token
  (
    q IS NULL
    OR i.company ILIKE '%' || q || '%'
    OR i.role_title ILIKE '%' || q || '%'
    OR EXISTS (
      SELECT 1 FROM unnest(coalesce(i.tech_stack,'{}'::text[])) t
      WHERE t ILIKE '%' || q || '%'
    )
  )
  -- locations: match location OR allow remote if 'Remote' in list
  AND (
    locations IS NULL
    OR i.location = ANY (locations)
    OR ( 'Remote' = ANY (locations) AND i.remote_flag = true )
  )
  -- visa sponsorship
  AND (
    visa = 'any'
    OR (visa = 'yes' AND i.visa_sponsorship::text = 'Yes')
    OR (visa = 'no' AND i.visa_sponsorship::text = 'No')
  )
  -- tech stack overlap (&&), not superset (@>)
  AND (
    stacks IS NULL
    OR coalesce(i.tech_stack,'{}'::text[]) && stacks
  )
  -- Only show active internships
  AND coalesce(i.is_texas, true) = true
  -- Exclude internships the user has already applied to
  AND (
    auth.uid() IS NULL 
    OR NOT EXISTS (
      SELECT 1 FROM public.applications a 
      WHERE a.internship_id = i.id 
      AND a.user_id = auth.uid()
    )
  )
ORDER BY coalesce(i.date_posted, now()::date) DESC
LIMIT limit_count OFFSET offset_count;
$function$;

-- Update explore_internships to exclude internships user has already applied to
CREATE OR REPLACE FUNCTION public.explore_internships(
  p_cities text[] DEFAULT NULL::text[], 
  p_visa text DEFAULT 'any'::text, 
  p_stacks text[] DEFAULT NULL::text[], 
  p_limit integer DEFAULT 20, 
  p_offset integer DEFAULT 0
)
RETURNS SETOF internships
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
SELECT *
FROM public.internships i
WHERE coalesce(i.is_texas, true) = true
  AND (p_cities IS NULL OR i.location = ANY(p_cities))
  AND (p_visa = 'any' OR 
       (p_visa = 'yes' AND i.visa_sponsorship::text = 'Yes') OR 
       (p_visa = 'no' AND i.visa_sponsorship::text = 'No'))
  AND (p_stacks IS NULL OR coalesce(i.tech_stack,'{}') && p_stacks)
  -- Exclude internships the user has already applied to
  AND (
    auth.uid() IS NULL 
    OR NOT EXISTS (
      SELECT 1 FROM public.applications a 
      WHERE a.internship_id = i.id 
      AND a.user_id = auth.uid()
    )
  )
ORDER BY coalesce(i.date_posted, now()::date) DESC, i.id
LIMIT p_limit OFFSET p_offset;
$function$;