-- Filter out international locations from top locations and deactivate those internships

-- Update get_top_locations to exclude Canada and London
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
      -- Exclude Canada and London
      AND location NOT ILIKE '%london%'
      AND location NOT ILIKE '%canada%'
      AND location NOT ILIKE '%toronto%'
      AND location NOT ILIKE '%vancouver%'
      AND location NOT ILIKE '%montreal%'
      AND location NOT ILIKE '%ottawa%'
      AND location NOT ILIKE '%calgary%'
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

-- Deactivate internships in Canada and London
UPDATE public.internships
SET is_active = false,
    updated_at = now()
WHERE location ILIKE '%london%'
   OR location ILIKE '%canada%'
   OR location ILIKE '%toronto%'
   OR location ILIKE '%vancouver%'
   OR location ILIKE '%montreal%'
   OR location ILIKE '%ottawa%'
   OR location ILIKE '%calgary%';