-- First, make the resumes bucket public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'resumes';

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can upload their own resumes" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own resumes" ON storage.objects;
DROP POLICY IF EXISTS "Employers can view applicant resumes" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own resumes" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own resumes" ON storage.objects;

-- Create fresh RLS policies for resume storage access
CREATE POLICY "Users can upload their own resumes" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'resumes' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own resumes" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'resumes' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Employers can view applicant resumes" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'resumes' 
  AND EXISTS (
    SELECT 1 
    FROM public.applications a
    JOIN public.jobs j ON a.job_id = j.id
    JOIN public.students s ON a.user_id = s.user_id
    WHERE j.employer_id = auth.uid()
    AND (storage.foldername(name))[1] = s.user_id::text
  )
);

CREATE POLICY "Users can update their own resumes" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'resumes' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own resumes" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'resumes' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);