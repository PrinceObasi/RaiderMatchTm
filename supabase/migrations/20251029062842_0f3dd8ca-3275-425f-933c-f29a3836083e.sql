-- Recreate the trigger function to ensure it's up to date
CREATE OR REPLACE FUNCTION public.handle_new_student()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create student record for users with role 'student'
  IF COALESCE(NEW.raw_user_meta_data->>'role', '') = 'student' THEN
    INSERT INTO public.students (user_id, name, email, is_international, onboarding_completed)
    VALUES (
      NEW.id,
      TRIM(CONCAT(
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        ' ',
        COALESCE(NEW.raw_user_meta_data->>'last_name', '')
      )),
      NEW.email,
      COALESCE((NEW.raw_user_meta_data->>'is_international')::boolean, false),
      false  -- Explicitly set to false so onboarding survey shows
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop trigger if it exists and recreate it
DROP TRIGGER IF EXISTS on_auth_user_created_student ON auth.users;

-- Create trigger to automatically run after user signup
CREATE TRIGGER on_auth_user_created_student
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_student();

-- Backfill missing student profiles for existing users
INSERT INTO public.students (user_id, name, email, is_international, onboarding_completed)
SELECT 
  u.id,
  TRIM(CONCAT(
    COALESCE(u.raw_user_meta_data->>'first_name', ''),
    ' ',
    COALESCE(u.raw_user_meta_data->>'last_name', '')
  )),
  u.email,
  COALESCE((u.raw_user_meta_data->>'is_international')::boolean, false),
  false
FROM auth.users u
LEFT JOIN public.students s ON s.user_id = u.id
WHERE s.id IS NULL
  AND COALESCE(u.raw_user_meta_data->>'role', '') = 'student'
  AND u.email IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;