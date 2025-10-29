-- Activate 20 inactive Texas internships with valid links
UPDATE internships 
SET is_active = true,
    updated_at = now(),
    archived_at = NULL
WHERE id IN (
  SELECT id 
  FROM internships 
  WHERE is_texas = true 
    AND is_active = false 
    AND (link_valid = true OR link_valid IS NULL)
    AND application_link IS NOT NULL 
    AND application_link != ''
  ORDER BY date_posted DESC NULLS LAST, created_at DESC
  LIMIT 20
);