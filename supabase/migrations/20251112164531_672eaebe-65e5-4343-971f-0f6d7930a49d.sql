-- Add resume_path column to store the storage path instead of public URL
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS resume_path text;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_students_resume_path ON public.students(resume_path) WHERE resume_path IS NOT NULL;

COMMENT ON COLUMN public.students.resume_path IS 'Storage path to resume file (e.g., resumes/<user_id>/<timestamp>.pdf). Use createSignedUrl to generate viewing URLs.';