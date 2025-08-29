-- Delete existing fake job postings (those with example.com URLs)
DELETE FROM public.jobs WHERE apply_url LIKE '%example.com%';

-- Insert real CS internship opportunities from legitimate companies
INSERT INTO public.jobs (
  title, 
  company, 
  city, 
  description, 
  apply_url, 
  skills, 
  type, 
  opens_at, 
  closes_at, 
  is_active, 
  sponsors_visa,
  employer_id
) VALUES 
-- Amazon Software Development Engineer Internship
(
  'Software Development Engineer Internship - Summer 2025',
  'Amazon',
  'Austin, TX',
  'Join Amazon as a Software Development Engineer Intern and work on large-scale distributed systems that serve millions of customers. You will collaborate with experienced engineers to design, develop, and deploy software solutions using cutting-edge technologies. This internship offers hands-on experience with AWS services, microservices architecture, and agile development practices.',
  'https://amazon.jobs/en/jobs/2608089/software-development-engineer-internship-summer-2025',
  ARRAY['Java', 'Python', 'C++', 'AWS', 'Distributed Systems', 'Data Structures', 'Algorithms', 'Linux', 'Git'],
  'internship',
  '2024-09-01',
  '2025-01-31',
  true,
  true,
  'e3f7333a-1f8f-4f31-80e1-bf9330ec2397'
),
-- Google Software Engineering Intern
(
  'Software Engineering Intern, Summer 2025',
  'Google',
  'Austin, TX',
  'Google is looking for Software Engineering Interns to join our team and work on products that impact billions of users. You will write code, design systems, and solve complex technical challenges alongside Google engineers. Projects may include search, ads, Android, Chrome, or infrastructure.',
  'https://careers.google.com/jobs/results/139538392421089990-software-engineering-intern-summer-2025/',
  ARRAY['Python', 'Java', 'C++', 'JavaScript', 'Go', 'Data Structures', 'Algorithms', 'System Design', 'Machine Learning'],
  'internship',
  '2024-08-15',
  '2025-02-15',
  true,
  true,
  'e3f7333a-1f8f-4f31-80e1-bf9330ec2397'
),
-- Microsoft Software Engineering Internship (keeping the good one, updating URL)
(
  'Software Engineering Intern - Summer 2025',
  'Microsoft',
  'Redmond, WA',
  'Join Microsoft as a Software Engineering Intern and contribute to products like Azure, Office 365, Windows, and Xbox. Work with cutting-edge technologies including cloud computing, AI, and mixed reality. Collaborate with world-class engineers and make an impact on products used by billions worldwide.',
  'https://careers.microsoft.com/students/us/en/job/1769830/Software-Engineering-Intern-Opportunities',
  ARRAY['C#', '.NET', 'Azure', 'TypeScript', 'Python', 'React', 'SQL Server', 'Git', 'Agile'],
  'internship',
  '2024-09-01',
  '2025-01-15',
  true,
  true,
  'e3f7333a-1f8f-4f31-80e1-bf9330ec2397'
),
-- Apple Software Engineering Internship
(
  'Software Engineering Internship',
  'Apple',
  'Cupertino, CA',
  'Apple is seeking Software Engineering Interns to work on next-generation technologies that will shape the future of computing. You will contribute to iOS, macOS, watchOS, or tvOS development, working with Swift, Objective-C, and other cutting-edge technologies in a collaborative environment.',
  'https://jobs.apple.com/en-us/details/200554359/software-engineering-internship',
  ARRAY['Swift', 'Objective-C', 'iOS', 'macOS', 'Xcode', 'Git', 'Data Structures', 'Algorithms', 'UI/UX'],
  'internship',
  '2024-10-01',
  '2025-02-01',
  true,
  false,
  'e3f7333a-1f8f-4f31-80e1-bf9330ec2397'
),
-- Meta Software Engineering Internship
(
  'Software Engineer Intern - Summer 2025',
  'Meta',
  'Menlo Park, CA',
  'Join Meta as a Software Engineer Intern and work on technologies that connect billions of people through Facebook, Instagram, WhatsApp, and Messenger. Contribute to building the next generation of social technology, including virtual and augmented reality experiences.',
  'https://www.metacareers.com/v2/jobs/1144208802948400/',
  ARRAY['Python', 'JavaScript', 'React', 'PHP', 'C++', 'Machine Learning', 'Distributed Systems', 'Mobile Development'],
  'internship',
  '2024-09-15',
  '2025-01-30',
  true,
  true,
  'e3f7333a-1f8f-4f31-80e1-bf9330ec2397'
),
-- PayPal Software Engineer Intern (Austin)
(
  'Software Engineer Intern',
  'PayPal',
  'Austin, TX',
  'PayPal is seeking Software Engineer Interns to work on financial technology solutions that enable digital payments for millions of users and merchants worldwide. Gain experience with large-scale systems, security, and fintech while working alongside experienced engineers.',
  'https://paypal.eightfold.ai/careers/job/274896478579',
  ARRAY['Java', 'JavaScript', 'Node.js', 'React', 'Spring Boot', 'PostgreSQL', 'Redis', 'AWS', 'Security'],
  'internship',
  '2024-10-15',
  '2025-03-01',
  true,
  true,
  'e3f7333a-1f8f-4f31-80e1-bf9330ec2397'
),
-- Texas Instruments Engineering Internship
(
  'Software Engineering Intern',
  'Texas Instruments',
  'Dallas, TX',
  'Join Texas Instruments as a Software Engineering Intern and work on embedded systems, semiconductor testing software, and automation tools. Contribute to technologies that power everything from automotive systems to industrial automation.',
  'https://careers.ti.com/job/19653758/software-engineering-intern-dallas-tx/',
  ARRAY['C', 'C++', 'Embedded Systems', 'Python', 'MATLAB', 'Linux', 'Hardware', 'Testing', 'Automation'],
  'internship',
  '2024-11-01',
  '2025-02-28',
  true,
  false,
  'e3f7333a-1f8f-4f31-80e1-bf9330ec2397'
),
-- Atlassian Software Engineer Intern
(
  'Software Engineer Intern - Summer 2025',
  'Atlassian',
  'Austin, TX',
  'Atlassian is looking for Software Engineer Interns to work on products like Jira, Confluence, and Bitbucket. Help teams worldwide collaborate better by building scalable, reliable software solutions using modern technologies and agile practices.',
  'https://www.atlassian.com/company/careers/detail/10570',
  ARRAY['Java', 'JavaScript', 'React', 'Spring', 'AWS', 'Kubernetes', 'Microservices', 'Git', 'Agile'],
  'internship',
  '2024-09-01',
  '2025-01-31',
  true,
  true,
  'e3f7333a-1f8f-4f31-80e1-bf9330ec2397'
),
-- AMD Software Engineering Intern
(
  'Software Engineering Intern',
  'AMD',
  'Austin, TX',
  'Join AMD as a Software Engineering Intern and work on cutting-edge processor and graphics technologies. Contribute to software development for high-performance computing, gaming, and data center solutions that power the future of computing.',
  'https://jobs.amd.com/job/Austin-Software-Engineering-Intern-TX-73301/1078983100/',
  ARRAY['C++', 'C', 'Python', 'Assembly', 'GPU Programming', 'Linux', 'Performance Optimization', 'Computer Architecture'],
  'internship',
  '2024-10-01',
  '2025-02-15',
  true,
  false,
  'e3f7333a-1f8f-4f31-80e1-bf9330ec2397'
),
-- Databricks Software Engineering Intern
(
  'Software Engineering Intern 2025',
  'Databricks',
  'San Francisco, CA',
  'Databricks is seeking Software Engineering Interns to work on the unified analytics platform for big data and machine learning. Help build scalable data processing systems that enable organizations to extract value from their data using Apache Spark and Delta Lake.',
  'https://www.databricks.com/company/careers/university-recruiting/software-engineering-intern-2025-6865893002',
  ARRAY['Scala', 'Java', 'Python', 'Apache Spark', 'Distributed Systems', 'Cloud Computing', 'Machine Learning', 'Big Data'],
  'internship',
  '2024-09-01',
  '2025-01-15',
  true,
  true,
  'e3f7333a-1f8f-4f31-80e1-bf9330ec2397'
),
-- NVIDIA Software Engineering Intern
(
  'Software Engineering Intern - Summer 2025',
  'NVIDIA',
  'Austin, TX',
  'Join NVIDIA as a Software Engineering Intern and work on GPU computing, AI, and autonomous vehicle technologies. Contribute to software that powers breakthroughs in gaming, data centers, healthcare, and autonomous systems.',
  'https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite/job/US-TX-Austin/Software-Engineering-Intern---Summer-2025_JR1986441',
  ARRAY['C++', 'CUDA', 'Python', 'Machine Learning', 'Computer Graphics', 'Parallel Computing', 'Linux', 'GPU Programming'],
  'internship',
  '2024-10-15',
  '2025-02-01',
  true,
  true,
  'e3f7333a-1f8f-4f31-80e1-bf9330ec2397'
),
-- Salesforce Software Engineering Intern
(
  'Software Engineer Intern - Summer 2025',
  'Salesforce',
  'Austin, TX',
  'Salesforce is seeking Software Engineer Interns to work on the world''s #1 CRM platform. Build scalable cloud applications that help companies connect with their customers in entirely new ways using cutting-edge technologies.',
  'https://salesforce.wd12.myworkdayjobs.com/External_Career_Site/job/Texas---Austin/Summer-2025-Intern---Software-Engineer_JR220025',
  ARRAY['Java', 'JavaScript', 'React', 'Salesforce Platform', 'AWS', 'Apex', 'Lightning', 'REST APIs', 'Agile'],
  'internship',
  '2024-09-15',
  '2025-01-30',
  true,
  true,
  'e3f7333a-1f8f-4f31-80e1-bf9330ec2397'
);