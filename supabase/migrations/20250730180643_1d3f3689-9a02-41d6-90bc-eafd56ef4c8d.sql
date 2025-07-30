-- Ensure applications table has correct user_id column structure and RLS policies
-- Fix user_id column and ensure it's not nullable
ALTER TABLE public.applications 
  ALTER COLUMN user_id SET NOT NULL;

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'applications_user_id_fkey' 
    AND table_name = 'applications'
  ) THEN
    ALTER TABLE public.applications 
      ADD CONSTRAINT applications_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Ensure RLS is enabled
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists and recreate it
DROP POLICY IF EXISTS "Owner can do everything" ON public.applications;

-- Create comprehensive RLS policy for owner access
CREATE POLICY "Owner can do everything"
  ON public.applications FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);