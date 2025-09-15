-- Update company URLs for Microsoft, Lucid Software, and Juniper Networks
UPDATE public.internships 
SET application_link = 'https://jobs.careers.microsoft.com/global/en/job/1860947/Software-Engineer%3A-Fullstack-Intern-Opportunities-for-University-Students%2C-Redmond'
WHERE company = 'Microsoft';

UPDATE public.internships 
SET application_link = 'https://job-boards.greenhouse.io/lucidsoftware/jobs/5596677004?utm_source=chatgpt.com'
WHERE company = 'Lucid Software' OR company = 'Lucid';

UPDATE public.internships 
SET application_link = 'https://careers.hpe.com/us/en/job/1192875/Technology-Solutions-Enablement-Intern'
WHERE company = 'Juniper Networks' OR company = 'Juniper';