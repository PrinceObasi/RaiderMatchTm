-- Add new profile features to students table
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS gpa NUMERIC,
  ADD COLUMN IF NOT EXISTS has_prev_intern BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS project_depth NUMERIC DEFAULT 0;