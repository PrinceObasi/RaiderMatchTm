-- Update application link for Stripe internship

UPDATE internships 
SET application_link = 'https://stripe.com/jobs/listing/software-engineer-intern/6230907/appl'
WHERE company ILIKE '%stripe%';