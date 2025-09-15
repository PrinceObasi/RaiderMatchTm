-- Update company URLs for HEB, Salesforce, Radix Trading, TikTok, CME Group, Bank of America, and Synchrony
UPDATE public.internships 
SET application_link = 'https://careers.heb.com/students'
WHERE company = 'HEB';

UPDATE public.internships 
SET application_link = 'https://careers.salesforce.com/en/jobs/jr308796/summer-2026-intern-software-engineer/'
WHERE company = 'Salesforce';

UPDATE public.internships 
SET application_link = 'https://job-boards.greenhouse.io/radixuniversity/jobs/7842108002'
WHERE company = 'Radix Trading';

UPDATE public.internships 
SET application_link = 'https://lifeattiktok.com/search/7533388869200333074'
WHERE company = 'TikTok';

UPDATE public.internships 
SET application_link = 'https://cmegroup.wd1.myworkdayjobs.com/cme_careers/job/chicago---20-s-wacker/software-engineering-internship---summer-2026_33043-1'
WHERE company = 'CME Group';

UPDATE public.internships 
SET application_link = 'https://careers.bankofamerica.com/en-us/students/job-detail/12942/global-technology-summer-analyst-2026-software-engineer-multiple-locations'
WHERE company = 'Bank of America';

UPDATE public.internships 
SET application_link = 'https://synchronyfinancial.wd5.myworkdayjobs.com/en-US/University/job/Software-Engineer-Intern_2401218'
WHERE company = 'Synchrony';