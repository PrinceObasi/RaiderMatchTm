-- Update application links for more internships (batch 3)

UPDATE internships 
SET application_link = 'https://jobs.apple.com/en-us/details/200606145/software-engineering-internships'
WHERE company ILIKE '%apple%';

UPDATE internships 
SET application_link = 'https://optiver.com/working-at-optiver/career-opportunities/7973726002/'
WHERE company ILIKE '%optiver%';

UPDATE internships 
SET application_link = 'https://careers.hitachi.com/jobs/15291856-software-engineer-intern-cross-project-tools'
WHERE company ILIKE '%hitachi%';

UPDATE internships 
SET application_link = 'https://jobs.fidelity.com/en/jobs/2116586/2026-undergraduate-leap-software-engineer/'
WHERE company ILIKE '%fidelity%';

UPDATE internships 
SET application_link = 'https://job-boards.greenhouse.io/klaviyocampus/jobs/7144362003'
WHERE company ILIKE '%klaviyo%';

UPDATE internships 
SET application_link = 'https://chevron.wd5.myworkdayjobs.com/University/job/Houston-Texas-United-States-of-America/XMLNAME-2025-2026--Information-Technology---Software-Engineering---Intern--Previous-Intern-_R000064550'
WHERE company ILIKE '%chevron%';

UPDATE internships 
SET application_link = 'https://hiring.fm/job/2026-return-intern-raytheon-software-engineer-intern-on-site-1754624847521-35-5163'
WHERE company ILIKE '%raytheon%' OR company ILIKE '%rtx%';

UPDATE internships 
SET application_link = 'https://jpmc.fa.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1002/job/210650080'
WHERE company ILIKE '%jpmorgan%' OR company ILIKE '%chase%' OR company ILIKE '%jp morgan%';

UPDATE internships 
SET application_link = 'https://job-boards.greenhouse.io/fiveringsllc/jobs/4806713008'
WHERE company ILIKE '%five rings%' OR company ILIKE '%five%rings%';