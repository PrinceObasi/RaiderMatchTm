-- Update application link for MongoDB

UPDATE internships 
SET application_link = 'https://www.mongodb.com/careers/jobs/7239454'
WHERE company ILIKE '%mongodb%';