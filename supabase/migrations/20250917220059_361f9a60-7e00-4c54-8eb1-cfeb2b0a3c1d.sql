-- Create random_internships function
CREATE OR REPLACE FUNCTION public.random_internships(limit_count int DEFAULT 10)
RETURNS SETOF public.internships
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT *
  FROM public.internships
  WHERE coalesce(is_texas, true) = true
  ORDER BY random()
  LIMIT limit_count;
$$;