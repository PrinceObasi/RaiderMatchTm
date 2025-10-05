-- Remove all internships not imported by the simplify scraper (97 rows with null scrape_source)
DELETE FROM public.internships 
WHERE scrape_source IS NULL;