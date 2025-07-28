-- Enable row-level security on the students table
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Students can insert their own data" ON public.students;
DROP POLICY IF EXISTS "Students can update their own data" ON public.students;
DROP POLICY IF EXISTS "Students can view their own data" ON public.students;

-- Create new policies using auth.uid() = id
CREATE POLICY "Students can view their own data" 
ON public.students 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Students can insert their own data" 
ON public.students 
FOR INSERT 
WITH CHECK (auth.uid() = id);

CREATE POLICY "Students can update their own data" 
ON public.students 
FOR UPDATE 
USING (auth.uid() = id);