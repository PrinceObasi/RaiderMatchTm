-- Update dead links with working alternatives

-- Dell Technologies: Replace dead Workday link with their main internships page
UPDATE internships 
SET application_link = 'https://jobs.dell.com/en/internships' 
WHERE company = 'Dell Technologies' 
AND role_title = 'Summer Internship – Software Engineering';

-- Cloudflare: Replace dead Greenhouse link with their internship program page
UPDATE internships 
SET application_link = 'https://www.cloudflare.com/careers/early-talent/' 
WHERE company = 'Cloudflare' 
AND role_title = 'Software Engineer Intern (Summer 2026)';

-- Naptha AI: Replace dead AshbyHQ link with their careers page
UPDATE internships 
SET application_link = 'https://naptha.ai/careers' 
WHERE company = 'Naptha AI' 
AND role_title = 'Software Engineer Intern';

-- Indeed: Replace generic link with their proper careers page
UPDATE internships 
SET application_link = 'https://indeed.com/careers' 
WHERE company = 'Indeed' 
AND role_title = 'Software Engineering Intern';