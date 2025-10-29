-- Drop and recreate get_top_locations to return state-level data
DROP FUNCTION IF EXISTS get_top_locations(integer);

CREATE OR REPLACE FUNCTION get_top_locations(p_limit integer DEFAULT 15)
RETURNS TABLE(location_name text) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH active_locations AS (
    SELECT 
      CASE 
        -- Keep Remote and Austin, TX as-is
        WHEN location = 'Remote' OR location ILIKE 'Remote%' THEN 'Remote'
        WHEN location ILIKE 'Austin, TX%' OR location ILIKE 'Austin,%TX%' THEN 'Austin, TX'
        -- Extract state from "City, ST" format
        WHEN location ~ ', [A-Z]{2}' THEN 
          TRIM(SUBSTRING(location FROM ', ([A-Z]{2})'))
        ELSE NULL
      END as normalized_location,
      COUNT(*) as count
    FROM internships
    WHERE 
      is_active = true 
      AND location IS NOT NULL 
      AND location != ''
    GROUP BY normalized_location
    HAVING 
      CASE 
        WHEN location = 'Remote' OR location ILIKE 'Remote%' THEN 'Remote'
        WHEN location ILIKE 'Austin, TX%' OR location ILIKE 'Austin,%TX%' THEN 'Austin, TX'
        WHEN location ~ ', [A-Z]{2}' THEN 
          TRIM(SUBSTRING(location FROM ', ([A-Z]{2})'))
        ELSE NULL
      END IS NOT NULL
  )
  SELECT normalized_location
  FROM active_locations
  ORDER BY count DESC, normalized_location ASC
  LIMIT p_limit;
END;
$$;