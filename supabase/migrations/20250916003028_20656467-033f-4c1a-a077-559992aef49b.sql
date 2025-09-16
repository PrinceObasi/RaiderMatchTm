-- Update application links for Marvell and Hudson River Trading

UPDATE internships 
SET application_link = 'https://marvell.wd1.myworkdayjobs.com/en-US/MarvellCareers/job/Software-Engineer-Intern_2401926'
WHERE company ILIKE '%marvell%';

UPDATE internships 
SET application_link = 'https://www.hudsonrivertrading.com/hrt-job/software-engineering-internship-summer-2026/'
WHERE company ILIKE '%hudson river trading%' OR company ILIKE '%hrt%';