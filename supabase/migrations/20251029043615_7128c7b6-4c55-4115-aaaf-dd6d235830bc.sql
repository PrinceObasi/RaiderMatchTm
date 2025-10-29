-- Update get_top_locations to return full state names
DROP FUNCTION IF EXISTS get_top_locations(integer);

CREATE OR REPLACE FUNCTION get_top_locations(p_limit integer DEFAULT 15)
RETURNS TABLE(location_name text) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH active_locations AS (
    SELECT 
      CASE 
        -- Keep Remote and Austin, TX as-is
        WHEN location = 'Remote' OR location ILIKE 'Remote%' THEN 'Remote'
        WHEN location ILIKE 'Austin, TX%' OR location ILIKE 'Austin,%TX%' THEN 'Austin, Texas'
        -- Extract state from "City, ST" format and convert to full name
        WHEN location ~ ', [A-Z]{2}' THEN 
          CASE TRIM(SUBSTRING(location FROM ', ([A-Z]{2})'))
            WHEN 'AL' THEN 'Alabama'
            WHEN 'AK' THEN 'Alaska'
            WHEN 'AZ' THEN 'Arizona'
            WHEN 'AR' THEN 'Arkansas'
            WHEN 'CA' THEN 'California'
            WHEN 'CO' THEN 'Colorado'
            WHEN 'CT' THEN 'Connecticut'
            WHEN 'DE' THEN 'Delaware'
            WHEN 'FL' THEN 'Florida'
            WHEN 'GA' THEN 'Georgia'
            WHEN 'HI' THEN 'Hawaii'
            WHEN 'ID' THEN 'Idaho'
            WHEN 'IL' THEN 'Illinois'
            WHEN 'IN' THEN 'Indiana'
            WHEN 'IA' THEN 'Iowa'
            WHEN 'KS' THEN 'Kansas'
            WHEN 'KY' THEN 'Kentucky'
            WHEN 'LA' THEN 'Louisiana'
            WHEN 'ME' THEN 'Maine'
            WHEN 'MD' THEN 'Maryland'
            WHEN 'MA' THEN 'Massachusetts'
            WHEN 'MI' THEN 'Michigan'
            WHEN 'MN' THEN 'Minnesota'
            WHEN 'MS' THEN 'Mississippi'
            WHEN 'MO' THEN 'Missouri'
            WHEN 'MT' THEN 'Montana'
            WHEN 'NE' THEN 'Nebraska'
            WHEN 'NV' THEN 'Nevada'
            WHEN 'NH' THEN 'New Hampshire'
            WHEN 'NJ' THEN 'New Jersey'
            WHEN 'NM' THEN 'New Mexico'
            WHEN 'NY' THEN 'New York'
            WHEN 'NC' THEN 'North Carolina'
            WHEN 'ND' THEN 'North Dakota'
            WHEN 'OH' THEN 'Ohio'
            WHEN 'OK' THEN 'Oklahoma'
            WHEN 'OR' THEN 'Oregon'
            WHEN 'PA' THEN 'Pennsylvania'
            WHEN 'RI' THEN 'Rhode Island'
            WHEN 'SC' THEN 'South Carolina'
            WHEN 'SD' THEN 'South Dakota'
            WHEN 'TN' THEN 'Tennessee'
            WHEN 'TX' THEN 'Texas'
            WHEN 'UT' THEN 'Utah'
            WHEN 'VT' THEN 'Vermont'
            WHEN 'VA' THEN 'Virginia'
            WHEN 'WA' THEN 'Washington'
            WHEN 'WV' THEN 'West Virginia'
            WHEN 'WI' THEN 'Wisconsin'
            WHEN 'WY' THEN 'Wyoming'
            WHEN 'DC' THEN 'District of Columbia'
            ELSE NULL
          END
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
        WHEN location ILIKE 'Austin, TX%' OR location ILIKE 'Austin,%TX%' THEN 'Austin, Texas'
        WHEN location ~ ', [A-Z]{2}' THEN 
          CASE TRIM(SUBSTRING(location FROM ', ([A-Z]{2})'))
            WHEN 'AL' THEN 'Alabama'
            WHEN 'AK' THEN 'Alaska'
            WHEN 'AZ' THEN 'Arizona'
            WHEN 'AR' THEN 'Arkansas'
            WHEN 'CA' THEN 'California'
            WHEN 'CO' THEN 'Colorado'
            WHEN 'CT' THEN 'Connecticut'
            WHEN 'DE' THEN 'Delaware'
            WHEN 'FL' THEN 'Florida'
            WHEN 'GA' THEN 'Georgia'
            WHEN 'HI' THEN 'Hawaii'
            WHEN 'ID' THEN 'Idaho'
            WHEN 'IL' THEN 'Illinois'
            WHEN 'IN' THEN 'Indiana'
            WHEN 'IA' THEN 'Iowa'
            WHEN 'KS' THEN 'Kansas'
            WHEN 'KY' THEN 'Kentucky'
            WHEN 'LA' THEN 'Louisiana'
            WHEN 'ME' THEN 'Maine'
            WHEN 'MD' THEN 'Maryland'
            WHEN 'MA' THEN 'Massachusetts'
            WHEN 'MI' THEN 'Michigan'
            WHEN 'MN' THEN 'Minnesota'
            WHEN 'MS' THEN 'Mississippi'
            WHEN 'MO' THEN 'Missouri'
            WHEN 'MT' THEN 'Montana'
            WHEN 'NE' THEN 'Nebraska'
            WHEN 'NV' THEN 'Nevada'
            WHEN 'NH' THEN 'New Hampshire'
            WHEN 'NJ' THEN 'New Jersey'
            WHEN 'NM' THEN 'New Mexico'
            WHEN 'NY' THEN 'New York'
            WHEN 'NC' THEN 'North Carolina'
            WHEN 'ND' THEN 'North Dakota'
            WHEN 'OH' THEN 'Ohio'
            WHEN 'OK' THEN 'Oklahoma'
            WHEN 'OR' THEN 'Oregon'
            WHEN 'PA' THEN 'Pennsylvania'
            WHEN 'RI' THEN 'Rhode Island'
            WHEN 'SC' THEN 'South Carolina'
            WHEN 'SD' THEN 'South Dakota'
            WHEN 'TN' THEN 'Tennessee'
            WHEN 'TX' THEN 'Texas'
            WHEN 'UT' THEN 'Utah'
            WHEN 'VT' THEN 'Vermont'
            WHEN 'VA' THEN 'Virginia'
            WHEN 'WA' THEN 'Washington'
            WHEN 'WV' THEN 'West Virginia'
            WHEN 'WI' THEN 'Wisconsin'
            WHEN 'WY' THEN 'Wyoming'
            WHEN 'DC' THEN 'District of Columbia'
            ELSE NULL
          END
        ELSE NULL
      END IS NOT NULL
  )
  SELECT normalized_location
  FROM active_locations
  ORDER BY count DESC, normalized_location ASC
  LIMIT p_limit;
END;
$$;