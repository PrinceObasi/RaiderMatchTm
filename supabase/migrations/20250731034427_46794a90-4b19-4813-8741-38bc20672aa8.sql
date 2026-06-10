-- Update the match_internships function to include visa sponsorship filtering
CREATE OR REPLACE FUNCTION public.match_internships(student_skills text[], is_international boolean DEFAULT false)
 RETURNS TABLE(id uuid, title text, company text, city text, description text, skills text[], similarity double precision)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    j.id,
    j.title,
    j.company,
    j.city,
    j.description,
    j.skills,
    similarity(
      array_to_string(j.skills, ' '),
      array_to_string(student_skills, ' ')
    ) AS similarity
  FROM public.jobs j
  WHERE j.title ILIKE '%intern%'
    AND j.opens_at <= current_date
    AND (j.closes_at IS NULL OR j.closes_at >= current_date)
    AND j.is_active = true
    AND (
      is_international = false             -- domestic: see all
      OR (is_international = true          -- intl: only when sponsor
          AND j.sponsors_visa = true)
    )
  ORDER BY similarity DESC
  LIMIT 5;
END;
$function$