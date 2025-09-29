-- Drop existing function first to avoid return type conflict
DROP FUNCTION IF EXISTS public.match_internships_for_user(uuid, integer, integer);

-- Recreate function with updated return type to include direct_link and link_type
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
  visa_sponsorship public.visa_sponsorship_status,
  application_link text,
  direct_link text,
  link_type text,
  date_posted date,
  deadline date
)
LANGUAGE sql
STABLE
SECURITY DEFINER
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
         s.deadline
  FROM scored s
  ORDER BY s.overlap DESC, coalesce(s.date_posted, now()::date) DESC
  LIMIT p_limit OFFSET p_offset;
$function$;