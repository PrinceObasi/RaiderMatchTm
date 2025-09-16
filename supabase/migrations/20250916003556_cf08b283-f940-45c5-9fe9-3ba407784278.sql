-- Remove BILL (Bill.com) Software Engineer Intern listing

DELETE FROM internships 
WHERE company ILIKE '%bill%' 
  AND (role_title ILIKE '%software engineer intern%' OR role_title ILIKE '%2026 campus recruiting%')
  AND location ILIKE '%draper%';