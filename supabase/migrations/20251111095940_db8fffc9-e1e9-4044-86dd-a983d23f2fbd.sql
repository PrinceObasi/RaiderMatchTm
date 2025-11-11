-- Remove location-related columns from student_preferences
ALTER TABLE public.student_preferences 
DROP COLUMN IF EXISTS preferred_locations,
DROP COLUMN IF EXISTS open_to_any_location;