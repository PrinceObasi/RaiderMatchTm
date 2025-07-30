-- Seed 5 test internship jobs for testing the Apply → My Applications flow
INSERT INTO public.jobs (title, company, city, description, skills, apply_url, opens_at, closes_at, is_active, type) VALUES
(
  'Software Engineering Intern – Summer 2025',
  'Microsoft',
  'Austin, TX',
  'Work on Azure micro-services with senior engineers.',
  ARRAY['C#', '.NET', 'Azure'],
  'https://careers.microsoft.com/us/en/job/00001',
  '2025-07-30',
  '2025-12-31',
  true,
  'internship'
),
(
  'Data Science Intern',
  'IBM',
  'Dallas, TX',
  'Build ML models & dashboards with our Watson team.',
  ARRAY['Python', 'Pandas', 'Machine Learning'],
  'https://www.ibm.com/us-en/employment/intern_ds',
  '2025-07-30',
  '2025-12-31',
  true,
  'internship'
),
(
  'Cybersecurity Intern',
  'Lockheed Martin',
  'Fort Worth, TX',
  'Assist in threat detection & vulnerability research.',
  ARRAY['Linux', 'Networking', 'Python'],
  'https://lockheedmartin.jobs/job/00002',
  '2025-07-30',
  '2025-12-31',
  true,
  'internship'
),
(
  'Backend Engineering Intern',
  'Stripe',
  'Remote (USA)',
  'Work on high-scale payments APIs in Go & TypeScript.',
  ARRAY['Go', 'Postgres', 'Distributed Systems'],
  'https://stripe.com/jobs/apply/00003',
  '2025-07-30',
  '2025-12-31',
  true,
  'internship'
),
(
  'Frontend Engineering Intern',
  'Dell Technologies',
  'Round Rock, TX',
  'Ship React/TypeScript UI for enterprise dashboards.',
  ARRAY['React', 'TypeScript', 'Tailwind'],
  'https://jobs.dell.com/intern_fe',
  '2025-07-30',
  '2025-12-31',
  true,
  'internship'
);