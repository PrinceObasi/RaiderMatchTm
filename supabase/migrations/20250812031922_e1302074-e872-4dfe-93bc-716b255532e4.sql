-- Add phone number and SMS consent columns to students table
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS sms_opt_in BOOLEAN DEFAULT false;