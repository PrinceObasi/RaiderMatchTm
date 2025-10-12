-- Critical security fix: Explicitly deny anonymous access to students table
-- This prevents unauthorized access to personal information (emails, phone numbers, names, resumes)

-- Drop existing permissive policies and recreate with explicit authentication checks
DROP POLICY IF EXISTS "Students can view their own data" ON public.students;
DROP POLICY IF EXISTS "Students can insert their own data" ON public.students;
DROP POLICY IF EXISTS "Students can update their own data" ON public.students;

-- Recreate policies with explicit authentication requirement
CREATE POLICY "Students can view their own data"
ON public.students
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Students can insert their own data"
ON public.students
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Students can update their own data"
ON public.students
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Add RLS to jobs_for_app view (if it's a table)
-- If jobs_for_app is a view, RLS from underlying tables will apply
-- But we'll ensure it's protected
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'jobs_for_app'
  ) THEN
    ALTER TABLE public.jobs_for_app ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Authenticated users can view jobs"
    ON public.jobs_for_app
    FOR SELECT
    TO authenticated
    USING (true);
  END IF;
END $$;

-- Add policy for users to view their own job events (transparency)
CREATE POLICY "Users can view their own events"
ON public.job_events
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);