-- Update function to get top locations with better normalization
DROP FUNCTION IF EXISTS public.get_top_locations(integer);

CREATE OR REPLACE FUNCTION public.get_top_locations(p_limit integer DEFAULT 15)
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  WITH normalized_locations AS (
    SELECT 
      CASE 
        WHEN location = 'NYC' THEN 'New York, NY'
        WHEN location = 'SF' THEN 'San Francisco, CA'
        WHEN location = 'Remote in USA' THEN 'Remote'
        ELSE location
      END as normalized_location,
      COUNT(*) as count
    FROM public.internships
    WHERE is_active = true
      AND location IS NOT NULL
      AND location != ''
    GROUP BY 
      CASE 
        WHEN location = 'NYC' THEN 'New York, NY'
        WHEN location = 'SF' THEN 'San Francisco, CA'
        WHEN location = 'Remote in USA' THEN 'Remote'
        ELSE location
      END
  )
  SELECT ARRAY(
    SELECT normalized_location
    FROM normalized_locations
    ORDER BY count DESC
    LIMIT p_limit
  );
$$;