-- Mark Southwest Airlines internships as inactive
UPDATE internships 
SET is_active = false, 
    archived_at = now(),
    updated_at = now()
WHERE company ILIKE '%Southwest Airlines%';