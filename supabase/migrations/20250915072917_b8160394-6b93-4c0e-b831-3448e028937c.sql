-- Update company URLs for Dell, General Motors, Intuit, Brunswick Corporation, Charles Schwab, and D. E. Shaw & Co.
UPDATE public.internships 
SET application_link = 'https://jobs.dell.com/en/job/austin/dell-csg-hardware-engineering-intern/375/85973231008'
WHERE company = 'Dell';

UPDATE public.internships 
SET application_link = 'https://search-careers.gm.com/en/jobs/jr-202512915/2026-summer-intern-strategy-transformation-data-engineer/'
WHERE company = 'General Motors';

UPDATE public.internships 
SET application_link = 'https://jobs.intuit.com/job/mountain-view/summer-2026-full-stack-engineering-intern/27595/86084161280'
WHERE company = 'Intuit';

UPDATE public.internships 
SET application_link = 'https://brunswick.wd1.myworkdayjobs.com/search/job/Tulsa-OK/Software-Engineering-Intern_JR-047573'
WHERE company = 'Brunswick Corporation';

UPDATE public.internships 
SET application_link = 'https://www.schwabjobs.com/job/southlake/2026-charles-schwab-technology-intern-software-engineering/33727/85564474864'
WHERE company = 'Charles Schwab';

UPDATE public.internships 
SET application_link = 'https://www.deshaw.com/careers/software-developer-intern-new-york-summer-2026-5521'
WHERE company = 'D. E. Shaw & Co.';