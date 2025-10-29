-- Update CrowdStrike internship
UPDATE internships 
SET summary_text = 'As a Research Intern on the SCAR team, you''ll prototype detection tooling and support a machine-learning project that strengthens threat hunting. You''ll collaborate with engineers and researchers to turn ideas into working prototypes that streamline analyst workflows. Hybrid in Austin (2 days/week).',
    description_text = 'As a Research Intern on the SCAR team, you''ll prototype detection tooling and support a machine-learning project that strengthens threat hunting. You''ll collaborate with engineers and researchers to turn ideas into working prototypes that streamline analyst workflows. Hybrid in Austin (2 days/week).',
    tech_stack = ARRAY['python', 'go', 'java', 'r', 'scikit-learn', 'linux', 'git', 'sql']
WHERE id = '027cebe2-dd0c-45ca-9144-4ff92d6de32d';

-- Update 7-Eleven internship (adjusted tags to canonical list)
UPDATE internships 
SET summary_text = 'As a Software Engineering Intern, you''ll build and enhance POS, mobile, and retail systems across the full SDLC design, development, testing, and deployment. You''ll integrate new products into existing platforms, analyze performance, and create consistent design docs while collaborating with cross-functional teams.',
    description_text = 'As a Software Engineering Intern, you''ll build and enhance POS, mobile, and retail systems across the full SDLC design, development, testing, and deployment. You''ll integrate new products into existing platforms, analyze performance, and create consistent design docs while collaborating with cross-functional teams.',
    tech_stack = ARRAY['c++', '.net', 'sql', 'angular', 'javascript', 'node.js', 'rest', 'css']
WHERE id = '4738269f-fdfc-4e2b-9b59-cdfcbe716bfa';

-- Update HF Sinclair internship (adjusted tags to canonical list)
UPDATE internships 
SET summary_text = 'As a Data Analytics & AI Intern in Dallas, you''ll collect, clean, and analyze datasets, then build visuals and reports that drive decisions. You''ll help prototype and deploy ML/AI solutions, working across real business use cases with modern cloud and analytics tooling.',
    description_text = 'As a Data Analytics & AI Intern in Dallas, you''ll collect, clean, and analyze datasets, then build visuals and reports that drive decisions. You''ll help prototype and deploy ML/AI solutions, working across real business use cases with modern cloud and analytics tooling.',
    tech_stack = ARRAY['python', 'sql', 'azure', 'pandas', 'scikit-learn', 'cloud']
WHERE id = 'ed01ca44-235b-459d-863f-3e713e87af41';

-- Update Corebridge Financial internship
UPDATE internships 
SET summary_text = 'As an IT Summer Intern at Corebridge Financial, you''ll join a software or systems engineering team to build and automate applications or design cloud/network infrastructure in an agile environment. You''ll ship code, contribute to tooling, and learn how large-scale systems run in finance over a 10-week program for rising juniors/seniors.',
    description_text = 'As an IT Summer Intern at Corebridge Financial, you''ll join a software or systems engineering team to build and automate applications or design cloud/network infrastructure in an agile environment. You''ll ship code, contribute to tooling, and learn how large-scale systems run in finance over a 10-week program for rising juniors/seniors.',
    tech_stack = ARRAY['java', 'c++', 'c#', 'python', 'sql', 'linux', 'git', 'docker', 'aws', 'azure']
WHERE id = '2f99c1f3-3016-4065-bce6-60a5f72bba49';

-- Update GM Financial internship
UPDATE internships 
SET summary_text = 'As a Software/DevOps Intern at GM Financial, you''ll ship features across web, mobile, data, and API services while practicing Agile—stand-ups, planning, reviews, retros. You''ll harden reliability by fixing vulnerabilities and improving CI/CD pipelines, then present a capstone at the end of the 12-week hybrid program (2 days in office).',
    description_text = 'As a Software/DevOps Intern at GM Financial, you''ll ship features across web, mobile, data, and API services while practicing Agile—stand-ups, planning, reviews, retros. You''ll harden reliability by fixing vulnerabilities and improving CI/CD pipelines, then present a capstone at the end of the 12-week hybrid program (2 days in office).',
    tech_stack = ARRAY['java', 'python', 'javascript', 'typescript', 'react', 'node.js', 'sql', 'git', 'docker', 'kubernetes']
WHERE id = '9383b5c1-b245-4541-893f-a9e2e8c2bc23';