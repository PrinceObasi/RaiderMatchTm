-- Remove Token Metrics from job postings by marking them as inactive
UPDATE public.internships
SET is_active = false
WHERE company ILIKE '%Token Metrics%';