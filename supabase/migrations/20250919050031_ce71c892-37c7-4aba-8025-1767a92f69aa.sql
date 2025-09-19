-- Create the explore_internships RPC function
CREATE OR REPLACE FUNCTION public.explore_internships(
  p_cities text[] DEFAULT NULL,
  p_visa text DEFAULT 'any',
  p_stacks text[] DEFAULT NULL,
  p_limit int DEFAULT 20,
  p_offset int DEFAULT 0
) RETURNS SETOF public.internships
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
SELECT *
FROM public.internships i
WHERE i.is_active = true
  AND coalesce(i.is_texas, true) = true
  AND (p_cities IS NULL OR i.city = ANY(p_cities))
  AND (p_visa = 'any' OR 
       (p_visa = 'yes' AND i.visa_sponsorship::text = 'Yes') OR 
       (p_visa = 'no' AND i.visa_sponsorship::text = 'No'))
  AND (p_stacks IS NULL OR coalesce(i.tech_stack,'{}') && p_stacks)
ORDER BY coalesce(i.date_posted, now()::date) DESC, i.id
LIMIT p_limit OFFSET p_offset;
$$;