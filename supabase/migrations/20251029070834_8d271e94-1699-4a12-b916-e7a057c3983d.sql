-- Archive the UK-based internship
UPDATE internships 
SET is_active = false, 
    archived_at = now(),
    needs_review = false
WHERE id = '1e8ca6fb-511a-46dd-85ce-4fe3e8f2668d';