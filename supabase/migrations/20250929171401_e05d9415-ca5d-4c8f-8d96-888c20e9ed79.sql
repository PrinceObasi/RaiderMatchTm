-- Reset all the logo extractions so they can be re-processed
UPDATE internships 
SET 
  direct_link = NULL,
  link_type = NULL,
  link_extracted_at = NULL,
  extraction_attempts = 0
WHERE scrape_source = 'simplify_jobs'
  AND (
    direct_link LIKE '%logo%' 
    OR direct_link LIKE '%.png%'
    OR direct_link LIKE '%.jpg%'
    OR direct_link LIKE '%.jpeg%'
    OR direct_link LIKE '%.svg%'
    OR direct_link LIKE '%simplify-imgs%'
  );

-- Check what we're dealing with after reset
SELECT 
  COUNT(*) as total,
  COUNT(direct_link) as has_direct_link,
  COUNT(*) FILTER (WHERE direct_link LIKE '%logo%') as has_logo
FROM internships
WHERE scrape_source = 'simplify_jobs';