-- Fix remaining functions that don't have search_path set

-- Update search_internships function
CREATE OR REPLACE FUNCTION public.search_internships(q text DEFAULT NULL::text, locations text[] DEFAULT NULL::text[], visa text DEFAULT 'any'::text, stacks text[] DEFAULT NULL::text[], user_gpa numeric DEFAULT NULL::numeric, respect_gpa boolean DEFAULT false, limit_count integer DEFAULT 20, offset_count integer DEFAULT 0)
 RETURNS SETOF internships
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path = 'public'
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

-- Update internships_tsv_trigger function
CREATE OR REPLACE FUNCTION public.internships_tsv_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
begin
  new.search_tsv :=
    setweight(to_tsvector('simple', coalesce(new.company,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(new.role_title,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(array_to_string(new.tech_stack, ' '),'')), 'B') ||
    setweight(to_tsvector('simple', coalesce(new.location,'')), 'C');
  return new;
end
$function$;