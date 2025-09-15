-- Update company URLs for Epirus, Akuna Capital, Neuralink, Bosch, Kitware, and Nuro
UPDATE public.internships 
SET application_link = 'https://www.snagajob.com/jobs/1161359275'
WHERE company = 'Epirus';

UPDATE public.internships 
SET application_link = 'https://builtin.com/job/software-engineer-intern-full-stack-web-summer-2026/6632362'
WHERE company = 'Akuna Capital';

UPDATE public.internships 
SET application_link = 'https://neuralink.com/careers/apply/?gh_jid=6672977003&gh_src=c356a2533us'
WHERE company = 'Neuralink';

UPDATE public.internships 
SET application_link = 'https://jobs.bosch.com/en/job/REF266491O-it-intern'
WHERE company = 'Bosch';

UPDATE public.internships 
SET application_link = 'https://jobs.lever.co/kitware/ac5a8edf-d005-4706-a01c-3d3b85cadb93'
WHERE company = 'Kitware';

UPDATE public.internships 
SET application_link = 'https://neuralink.com/careers/apply/?gh_jid=6672977003&gh_src=c356a2533us'
WHERE company = 'Nuro';