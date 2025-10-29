-- Archive the specific internship posting
UPDATE internships 
SET is_active = false, 
    archived_at = now(),
    needs_review = false
WHERE id = '68e8c4c1-e93b-4089-a19f-917315cff17f';