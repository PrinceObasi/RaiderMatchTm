-- Archive all internships with "hardware" in role title
UPDATE internships 
SET 
  is_active = false, 
  archived_at = COALESCE(archived_at, now()),
  needs_review = false
WHERE is_active = true
  AND role_title ILIKE '%hardware%';