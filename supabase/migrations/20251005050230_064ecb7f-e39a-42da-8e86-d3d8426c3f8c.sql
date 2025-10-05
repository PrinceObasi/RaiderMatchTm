-- Set is_texas = true for all existing Simplify internships
-- This makes them visible to Texas students (nationwide postings are available to TX students)
UPDATE public.internships 
SET is_texas = true 
WHERE scrape_source = 'simplify_jobs';