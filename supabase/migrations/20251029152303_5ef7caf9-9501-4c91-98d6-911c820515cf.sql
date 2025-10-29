-- Archive all non-US Electronic Arts internships
UPDATE internships 
SET 
  is_active = false, 
  archived_at = COALESCE(archived_at, now()),
  needs_review = false
WHERE company = 'Electronic Arts' 
  AND (
    location ILIKE '%UK%' 
    OR location ILIKE '%United Kingdom%'
    OR location ILIKE '%Canada%'
    OR location ILIKE '%Vancouver%'
    OR location ILIKE '%Montreal%'
    OR location ILIKE '%Toronto%'
    OR location ILIKE '%Ottawa%'
  );