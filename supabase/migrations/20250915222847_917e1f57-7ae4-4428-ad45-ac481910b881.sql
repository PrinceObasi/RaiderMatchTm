-- Update application links for multiple internships

UPDATE internships 
SET application_link = 'https://uscareers-lennox.icims.com/jobs/49997/ai-engineering-intern---summer-2026/job'
WHERE company ILIKE '%lennox%';

UPDATE internships 
SET application_link = 'https://ibmglobal.avature.net/en_US/careers/JobDetail/Software-Developer-Intern-2026/54845'
WHERE company ILIKE '%ibm%';

UPDATE internships 
SET application_link = 'https://job-boards.greenhouse.io/blackedgecapital/jobs/4596128005'
WHERE company ILIKE '%black edge%' OR company ILIKE '%blackedge%';

UPDATE internships 
SET application_link = 'https://careers.thetradedesk.com/jobs/4787577007/2026-north-america-software-engineering-internship'
WHERE company ILIKE '%trade desk%' OR company ILIKE '%tradedesk%';