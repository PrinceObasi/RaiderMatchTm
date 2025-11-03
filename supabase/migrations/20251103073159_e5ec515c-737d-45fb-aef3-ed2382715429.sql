-- Add missing profile fields to students table
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS university text,
  ADD COLUMN IF NOT EXISTS degree text,
  ADD COLUMN IF NOT EXISTS linkedin_url text,
  ADD COLUMN IF NOT EXISTS portfolio_url text,
  ADD COLUMN IF NOT EXISTS location_city text,
  ADD COLUMN IF NOT EXISTS location_state text,
  ADD COLUMN IF NOT EXISTS grad_month integer CHECK (grad_month >= 1 AND grad_month <= 12);