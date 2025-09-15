-- Update company URLs for C3.ai, Boeing, Workiva, and Block
UPDATE public.internships 
SET application_link = 'https://c3.ai/job-description/8111347002?gh_jid=8111347002'
WHERE company = 'C3.ai';

UPDATE public.internships 
SET application_link = 'https://boeing.wd1.myworkdayjobs.com/en-US/INTERN/job/Boeing-Summer-2026-Internship-Program--Paid----Engineering_JR2025468141'
WHERE company = 'Boeing';

UPDATE public.internships 
SET application_link = 'https://workiva.wd1.myworkdayjobs.com/en-US/careers/details/Summer-2026-Intern---Software-Engineering_R10636?workerSubType=831d1538442f014d2d2badf7c52a6e07'
WHERE company = 'Workiva';

UPDATE public.internships 
SET application_link = 'https://block.xyz/careers/jobs/4904198008'
WHERE company = 'Block';