-- Update email domain trigger to only enforce @ttu.edu for students
CREATE OR REPLACE FUNCTION public.check_ttu_domain()
RETURNS trigger
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path TO ''
AS $$
BEGIN
  -- Apply the domain rule **only** if role == 'student'
  IF (NEW.raw_user_meta_data ->> 'role') = 'student' THEN
    IF NEW.email !~* '@ttu\.edu$' THEN
      RAISE EXCEPTION 'INVALID_DOMAIN: students must use @ttu.edu';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Re-attach trigger (in case it was dropped earlier)
DROP TRIGGER IF EXISTS ttu_domain_enforcer ON auth.users;
CREATE TRIGGER ttu_domain_enforcer
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.check_ttu_domain();