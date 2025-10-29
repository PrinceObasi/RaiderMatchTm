
-- Update Skyryse internship
UPDATE internships 
SET 
  summary_text = 'As a Software V&V Intern, you''ll verify flight-critical control software for next-gen aircraft under DO-178C—designing procedures, running MIL/SIL simulations, and automating regression and coverage tests. You''ll build Python utilities, analyze results, and collaborate with GNC, Systems, and Dev teams to raise safety and reliability. Onsite in El Segundo, CA (12 weeks).',
  tech_stack = ARRAY['python', 'c', 'c++', 'matlab', 'simulink', 'git', 'linux', 'ci/cd', 'bash']
WHERE id = '317734b1-3109-4368-8c64-b75a1c7c0c5c';

-- Update AbbVie internship
UPDATE internships 
SET 
  summary_text = 'As a Software Engineering Co-Op on AbbVie''s Legal & Records BTS team, you''ll deliver GenAI-enabled use cases, perform business systems analysis, and support project delivery and roadmap execution. You''ll collaborate across teams to translate legal/business needs into working solutions over a June–December co-op in North Chicago, IL.',
  tech_stack = ARRAY['python', 'sql', 'azure', 'power bi', 'pandas', 'scikit-learn', 'rest', 'git']
WHERE id = '7f166319-466e-485e-b1bd-94a36f9cafb1';

-- Update Relay internship
UPDATE internships 
SET 
  summary_text = 'As a Product Engineering Intern at Relay, you''ll build features that turn frontline voice into structured, actionable intelligence and ship code across the stack in a fast-growing, in-office environment. You''ll collaborate in Agile sprints, design and test production-quality software, and help integrate AI into real workflows in Raleigh, NC.',
  tech_stack = ARRAY['java', 'javascript', 'python', 'erlang', 'linux', 'git', 'ci/cd', 'android']
WHERE id = 'cf34bd0c-7e9f-4768-a89f-cbf1e34a5103';

-- Update Aptiv internship
UPDATE internships 
SET 
  summary_text = 'As a Software Development Intern at Aptiv, you''ll build, test, and debug real-world applications that support next-gen automotive systems. You''ll collaborate in code reviews, improve existing codebases, and contribute to QA while sharpening fundamentals and exposure to embedded workflows.',
  tech_stack = ARRAY['c', 'c++', 'java', 'python', 'javascript', 'git', 'linux', 'ci/cd']
WHERE id = '87a3d606-d255-4ac4-8d48-a8143d48660b';
