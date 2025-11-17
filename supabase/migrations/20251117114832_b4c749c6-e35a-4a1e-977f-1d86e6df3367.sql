-- Update handle_new_user trigger to populate profiles with classification and graduation_year
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_classification text;
  v_graduation_year integer;
  v_student_year text;
BEGIN
  -- Get student_year from metadata
  v_student_year := COALESCE(NEW.raw_user_meta_data->>'student_year', '');
  
  -- Map student_year to classification
  v_classification := CASE v_student_year
    WHEN 'freshman' THEN 'Freshman'
    WHEN 'sophomore' THEN 'Sophomore'
    WHEN 'junior' THEN 'Junior'
    WHEN 'senior' THEN 'Senior'
    WHEN 'grad' THEN 'Graduate'
    ELSE NULL
  END;
  
  -- Calculate graduation_year based on classification (assuming current academic year)
  v_graduation_year := CASE v_student_year
    WHEN 'freshman' THEN EXTRACT(YEAR FROM CURRENT_DATE) + 4
    WHEN 'sophomore' THEN EXTRACT(YEAR FROM CURRENT_DATE) + 3
    WHEN 'junior' THEN EXTRACT(YEAR FROM CURRENT_DATE) + 2
    WHEN 'senior' THEN EXTRACT(YEAR FROM CURRENT_DATE) + 1
    WHEN 'grad' THEN EXTRACT(YEAR FROM CURRENT_DATE) + 1
    ELSE NULL
  END;
  
  -- Create profile entry with classification and graduation_year
  INSERT INTO public.profiles (user_id, classification, graduation_year)
  VALUES (NEW.id, v_classification, v_graduation_year)
  ON CONFLICT (user_id) DO UPDATE SET
    classification = COALESCE(EXCLUDED.classification, profiles.classification),
    graduation_year = COALESCE(EXCLUDED.graduation_year, profiles.graduation_year),
    updated_at = now();
  
  RETURN NEW;
END;
$function$;