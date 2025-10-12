-- Add column to track student's biggest internship search challenge
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS biggest_challenge text;

-- Add column to track if onboarding survey is completed
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;