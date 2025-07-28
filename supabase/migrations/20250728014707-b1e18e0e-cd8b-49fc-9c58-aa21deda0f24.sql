-- Create storage bucket for resumes
INSERT INTO storage.buckets (id, name, public) VALUES ('resumes', 'resumes', false);

-- Create RLS policies for resume storage
CREATE POLICY "Users can upload their own resumes" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own resumes" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own resumes" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own resumes" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create RPC function for similarity matching using pg_trgm
CREATE OR REPLACE FUNCTION public.match_internships(student_skills TEXT[])
RETURNS TABLE (
  id UUID,
  title TEXT,
  company TEXT,
  city TEXT,
  description TEXT,
  skills TEXT[],
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    j.id,
    j.title,
    j.company,
    j.city,
    j.description,
    j.skills,
    similarity(
      array_to_string(j.skills, ' '),
      array_to_string(student_skills, ' ')
    ) AS similarity
  FROM public.jobs j
  WHERE j.title ILIKE '%intern%'
  ORDER BY similarity DESC
  LIMIT 5;
END;
$$;