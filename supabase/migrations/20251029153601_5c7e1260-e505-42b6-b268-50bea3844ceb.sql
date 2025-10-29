-- Archive all internships in the United Kingdom
UPDATE internships 
SET 
  is_active = false, 
  archived_at = COALESCE(archived_at, now()),
  needs_review = false
WHERE is_active = true
  AND (
    location ILIKE '%United Kingdom%'
    OR location ILIKE '%UK%'
    OR location ILIKE '%England%'
    OR location ILIKE '%Scotland%'
    OR location ILIKE '%Wales%'
    OR location ILIKE '%London%'
    OR location ILIKE '%Manchester%'
    OR location ILIKE '%Birmingham%'
  );