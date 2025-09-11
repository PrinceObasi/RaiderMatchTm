-- Fix the search_internships function to use correct table and columns
DROP FUNCTION IF EXISTS public.search_internships(text, text[], text, text[], numeric, boolean, integer, integer);

CREATE OR REPLACE FUNCTION public.search_internships(
  q text DEFAULT NULL,
  locations text[] DEFAULT NULL,
  visa text DEFAULT 'any',
  stacks text[] DEFAULT NULL,
  user_gpa numeric DEFAULT NULL,
  respect_gpa boolean DEFAULT false,
  limit_count integer DEFAULT 20,
  offset_count integer DEFAULT 0
)
RETURNS SETOF internships
LANGUAGE sql
STABLE
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
ORDER BY coalesce(i.date_posted, now()::date) DESC
LIMIT limit_count OFFSET offset_count;
$function$;