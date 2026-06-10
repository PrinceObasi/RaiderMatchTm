-- Add international student flag to students table
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS is_international BOOLEAN DEFAULT false;

-- Add visa sponsorship flag to jobs table  
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS sponsors_visa BOOLEAN DEFAULT false;