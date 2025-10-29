-- Archive AI-Summer Intern at Skyworks
UPDATE internships 
SET 
  is_active = false, 
  archived_at = COALESCE(archived_at, now()),
  needs_review = false
WHERE is_active = true
  AND company ILIKE '%Skyworks%'
  AND role_title ILIKE '%AI%Summer%Intern%';