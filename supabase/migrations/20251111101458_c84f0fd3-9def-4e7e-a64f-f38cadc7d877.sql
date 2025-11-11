-- Add optional professional profile URLs to students table
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS leetcode_url text,
ADD COLUMN IF NOT EXISTS kaggle_url text,
ADD COLUMN IF NOT EXISTS devpost_url text;