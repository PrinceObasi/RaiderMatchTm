-- Update company URLs for Goldman Sachs, Palantir, Belvedere Trading, Google, Millennium Management, Ramp, and Sentry
UPDATE public.internships 
SET application_link = 'https://higher.gs.com/roles/152627'
WHERE company = 'Goldman Sachs';

UPDATE public.internships 
SET application_link = 'https://jobs.lever.co/palantir/e27af7ab-41fc-40c9-b31d-02c6cb1c505c'
WHERE company = 'Palantir';

UPDATE public.internships 
SET application_link = 'https://jobs.lever.co/belvederetrading/eddfd030-1b27-46db-9ef6-5b65e1e2484c'
WHERE company = 'Belvedere Trading';

UPDATE public.internships 
SET application_link = 'https://www.google.com/about/careers/applications/jobs/results/75808725415142086-software-engineering-intern-bs-summer-2026'
WHERE company = 'Google';

UPDATE public.internships 
SET application_link = 'https://mlp.eightfold.ai/careers/job/755944533188'
WHERE company = 'Millennium Management';

UPDATE public.internships 
SET application_link = 'https://jobs.ashbyhq.com/ramp/c50962b5-c641-4d44-bbe5-7f1d6e7ce51f'
WHERE company = 'Ramp';

UPDATE public.internships 
SET application_link = 'https://jobs.ashbyhq.com/sentry/a5ce699d-b1a8-4b93-9217-33d16d77ccd6/'
WHERE company = 'Sentry';