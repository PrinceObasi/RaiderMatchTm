-- Update application links for Copart, Symbotic, and CNA Insurance internships

UPDATE internships 
SET application_link = 'https://copart.wd12.myworkdayjobs.com/en-US/Copart/job/Software-Engineering-Intern_JR101510'
WHERE company ILIKE '%copart%';

UPDATE internships 
SET application_link = 'https://www.symbotic.com/careers/open-positions/R5393/'
WHERE company ILIKE '%symbotic%';

UPDATE internships 
SET application_link = 'https://cna.wd1.myworkdayjobs.com/en-US/CNA_Careers/details/Technology-Internship-Program--Software-Engineering-_R-6394-1?q=internship&locationCountry=bc33aa3152ec42d4995f4791a106ed09'
WHERE company ILIKE '%cna%';