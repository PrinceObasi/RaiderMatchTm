-- Archive internships in UK and Canada
UPDATE internships
SET is_active = false,
    archived_at = now()
WHERE is_active = true
  AND (
    location ILIKE '%london%'
    OR location ILIKE '%united kingdom%'
    OR location ILIKE '%uk%'
    OR location ILIKE '%england%'
    OR location ILIKE '%scotland%'
    OR location ILIKE '%wales%'
    OR location ILIKE '%canada%'
    OR location ILIKE '%toronto%'
    OR location ILIKE '%vancouver%'
    OR location ILIKE '%montreal%'
    OR location ILIKE '%ottawa%'
    OR location ILIKE '%calgary%'
    OR location ILIKE '%edmonton%'
  );

-- Create function to validate US-only locations
CREATE OR REPLACE FUNCTION validate_us_location()
RETURNS TRIGGER AS $$
BEGIN
  -- Skip if location is NULL or empty
  IF NEW.location IS NULL OR NEW.location = '' THEN
    RETURN NEW;
  END IF;
  
  -- Check for non-US locations
  IF NEW.location ~* '(london|united kingdom|uk|england|scotland|wales|canada|toronto|vancouver|montreal|ottawa|calgary|edmonton)' THEN
    -- Auto-archive non-US postings
    NEW.is_active := false;
    NEW.archived_at := now();
    RAISE NOTICE 'Non-US location detected, auto-archiving: %', NEW.location;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to validate location on insert/update
DROP TRIGGER IF EXISTS validate_us_location_trigger ON internships;
CREATE TRIGGER validate_us_location_trigger
  BEFORE INSERT OR UPDATE OF location ON internships
  FOR EACH ROW
  EXECUTE FUNCTION validate_us_location();