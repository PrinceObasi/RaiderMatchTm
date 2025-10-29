-- Archive Inventing for Life internship
UPDATE internships 
SET is_active = false, 
    archived_at = now()
WHERE id = 'f58b38c9-01f4-4d39-a602-f138b933969a';