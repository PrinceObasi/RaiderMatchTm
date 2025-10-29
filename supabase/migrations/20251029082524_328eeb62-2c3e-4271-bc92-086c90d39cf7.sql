-- Archive Skyryse AI internship
UPDATE internships 
SET is_active = false, 
    archived_at = now()
WHERE id = '3ed1b919-9125-42a4-a970-99203a6b8e2c';