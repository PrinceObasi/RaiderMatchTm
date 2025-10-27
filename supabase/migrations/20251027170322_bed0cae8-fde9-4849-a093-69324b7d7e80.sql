-- Create function to get top locations dynamically from internships
CREATE OR REPLACE FUNCTION public.get_top_locations(p_limit integer DEFAULT 15)
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT ARRAY(
    SELECT location
    FROM public.internships
    WHERE is_active = true
      AND location IS NOT NULL
      AND location != ''
    GROUP BY location
    ORDER BY COUNT(*) DESC
    LIMIT p_limit
  );
$$;