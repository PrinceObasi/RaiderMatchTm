-- Archive WEX internship
UPDATE internships 
SET is_active = false, 
    archived_at = now()
WHERE id = '54b1f436-57ba-4c67-af48-8ffbf6917982';