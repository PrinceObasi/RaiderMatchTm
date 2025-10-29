-- Archive Hardware Engineering, Business, and Project Management roles
UPDATE internships
SET is_active = false,
    archived_at = now()
WHERE is_active = true
  AND (
    role_title ILIKE '%hardware%engineer%'
    OR role_title ILIKE '%hardware%intern%'
    OR role_title ILIKE '%business%analyst%'
    OR role_title ILIKE '%business%intern%'
    OR role_title ILIKE '%business%development%'
    OR role_title ILIKE '%project%manager%'
    OR role_title ILIKE '%project%management%'
    OR role_title ILIKE '%program%manager%'
    OR role_title ILIKE '%product%manager%'
    OR role_title ILIKE '%product%management%'
  );

-- Update the US location validation function to also check for excluded role types
CREATE OR REPLACE FUNCTION validate_internship_criteria()
RETURNS TRIGGER AS $$
BEGIN
  -- Skip if this is an update that's explicitly archiving
  IF TG_OP = 'UPDATE' AND NEW.is_active = false THEN
    RETURN NEW;
  END IF;

  -- Check for non-US locations
  IF NEW.location IS NOT NULL AND NEW.location != '' THEN
    IF NEW.location ~* '(london|united kingdom|uk|england|scotland|wales|canada|toronto|vancouver|montreal|ottawa|calgary|edmonton)' THEN
      NEW.is_active := false;
      NEW.archived_at := now();
      RAISE NOTICE 'Non-US location detected, auto-archiving: %', NEW.location;
      RETURN NEW;
    END IF;
  END IF;
  
  -- Check for excluded role types
  IF NEW.role_title IS NOT NULL AND NEW.role_title != '' THEN
    IF NEW.role_title ~* '(hardware.*(engineer|intern)|business.*(analyst|intern|development)|project.*(manager|management)|program.*manager|product.*(manager|management))' THEN
      NEW.is_active := false;
      NEW.archived_at := now();
      RAISE NOTICE 'Excluded role type detected, auto-archiving: %', NEW.role_title;
      RETURN NEW;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Replace the location trigger with the combined validation trigger
DROP TRIGGER IF EXISTS validate_us_location_trigger ON internships;
DROP TRIGGER IF EXISTS validate_internship_criteria_trigger ON internships;

CREATE TRIGGER validate_internship_criteria_trigger
  BEFORE INSERT OR UPDATE OF location, role_title ON internships
  FOR EACH ROW
  EXECUTE FUNCTION validate_internship_criteria();