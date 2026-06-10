-- Add missing columns to jobs table
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS employer_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS apply_url TEXT;

-- Update existing jobs to have a default apply_url if needed
UPDATE public.jobs 
SET apply_url = 'https://example.com/apply' 
WHERE apply_url IS NULL;