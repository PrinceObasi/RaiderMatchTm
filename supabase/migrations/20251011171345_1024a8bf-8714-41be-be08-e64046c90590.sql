-- Add profile fields to students table for work experience and projects
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS work_experience JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS projects JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.students.work_experience IS 'Array of work experience objects with fields: company, position, start_date, end_date, description';
COMMENT ON COLUMN public.students.projects IS 'Array of project objects with fields: title, description, tech_stack, url, start_date, end_date';