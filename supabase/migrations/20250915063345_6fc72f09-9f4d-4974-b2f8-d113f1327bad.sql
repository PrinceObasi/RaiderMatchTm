-- Update company URLs for Sierra Nevada Corporation, Roblox, Adobe, Perpay, Wells Fargo, and Datadog
UPDATE public.internships 
SET application_link = 'https://snc.wd1.myworkdayjobs.com/en-US/SNC_External_Career_Site/details/Data-Scientist-Intern---Summer-2026_R0028396?workerSubType=bd3f3405ddee105b4243e938c45a16d5'
WHERE company = 'Sierra Nevada Corporation';

UPDATE public.internships 
SET application_link = 'https://careers.roblox.com/jobs/7114765'
WHERE company = 'Roblox';

UPDATE public.internships 
SET application_link = 'https://careers.adobe.com/us/en/job/R158531/2026-Intern-Software-Engineer'
WHERE company = 'Adobe';

UPDATE public.internships 
SET application_link = 'https://job-boards.greenhouse.io/perpay/jobs/4076988007'
WHERE company = 'Perpay';

UPDATE public.internships 
SET application_link = 'https://www.wellsfargojobs.com/en/jobs/r-474982/2026-technology-summer-internship-early-careers-software-engineer/'
WHERE company = 'Wells Fargo';

UPDATE public.internships 
SET application_link = 'https://careers.datadoghq.com/detail/7158137/?gh_jid=7158137'
WHERE company = 'Datadog';