-- Remove job postings that are not enriched or lack tech stack
UPDATE internships 
SET is_active = false, 
    archived_at = now()
WHERE is_active = true 
  AND (
    enriched_at IS NULL 
    OR summary_text IS NULL 
    OR summary_text = ''
    OR tech_stack IS NULL 
    OR tech_stack = '{}'
    OR array_length(tech_stack, 1) IS NULL
  );