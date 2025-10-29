-- Archive all internships with "product" in role title or description
UPDATE internships 
SET 
  is_active = false, 
  archived_at = COALESCE(archived_at, now()),
  needs_review = false
WHERE is_active = true
  AND (
    role_title ILIKE '%product%'
    OR summary_text ILIKE '%product%'
    OR description_text ILIKE '%product%'
  );