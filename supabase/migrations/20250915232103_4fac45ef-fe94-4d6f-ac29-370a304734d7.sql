-- Update application links for more internships

UPDATE internships 
SET application_link = 'https://job-boards.greenhouse.io/pdtpartners/jobs/7073180'
WHERE company ILIKE '%pdt%' AND company ILIKE '%partners%';

UPDATE internships 
SET application_link = 'https://www.usaajobs.com/job/san-antonio/it-intern/1207/85923090448'
WHERE company ILIKE '%usaa%';

UPDATE internships 
SET application_link = 'https://jobs.northropgrumman.com/careers?query=internship&pid=1340059547080&domain=ngc.com&sort_by=relevance'
WHERE company ILIKE '%northrop%' AND company ILIKE '%grumman%';

UPDATE internships 
SET application_link = 'https://caci.wd1.myworkdayjobs.com/External/job/US-IL-Lisle/Software-Engineering-Intern---Summer-2026_317252'
WHERE company ILIKE '%caci%';

UPDATE internships 
SET application_link = 'https://careers.servicenow.com/jobs/744000079993731/utg-software-engineer-internships-summer-2026/'
WHERE company ILIKE '%servicenow%';