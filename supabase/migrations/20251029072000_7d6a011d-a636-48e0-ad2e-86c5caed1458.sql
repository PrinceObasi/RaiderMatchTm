-- Archive Southwest Airlines and GuideStone internships
UPDATE internships 
SET is_active = false, 
    archived_at = now(),
    needs_review = false
WHERE id IN ('ce9c985e-ced7-44ef-a16c-e8239a01c899', 'd171abdc-37b8-424f-9171-d91c4343be73');