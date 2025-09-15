-- Update company URLs for Figma, Citadel, SIG, Jane Street, Lyft, Texas Instruments, Red Hat, and AeroVironment
UPDATE public.internships 
SET application_link = 'https://job-boards.greenhouse.io/figma/jobs/5602159004'
WHERE company = 'Figma';

UPDATE public.internships 
SET application_link = 'https://www.citadel.com/careers/details/software-engineer-intern-us/'
WHERE company = 'Citadel';

UPDATE public.internships 
SET application_link = 'https://careers.sig.com/job/9749/Trading-System-Engineering-Internship-Summer-2026'
WHERE company = 'Susquehanna International Group' OR company = 'SIG' OR company = 'Susquehanna';

UPDATE public.internships 
SET application_link = 'https://www.janestreet.com/join-jane-street/position/8040547002/'
WHERE company = 'Jane Street';

UPDATE public.internships 
SET application_link = 'https://app.careerpuck.com/job-board/lyft/job/8130804002?gh_jid=8130804002&utm_source=chatgpt.com'
WHERE company = 'Lyft';

UPDATE public.internships 
SET application_link = 'https://careers.ti.com/en/sites/CX/job/25007126'
WHERE company = 'Texas Instruments';

UPDATE public.internships 
SET application_link = 'https://redhat.wd5.myworkdayjobs.com/en-US/Jobs/job/Software-Engineer-Intern_R-050088'
WHERE company = 'Red Hat';

UPDATE public.internships 
SET application_link = 'https://avav.wd1.myworkdayjobs.com/en-US/AVAV/job/Summer-2026-Software-Engineering-Intern_5873'
WHERE company = 'AeroVironment';