-- Update company URLs for BILL, Nelnet, Databricks, and Veeam
UPDATE public.internships 
SET application_link = 'https://www.bill.com/job/2026-campus-recruiting-software-engineer-intern'
WHERE company = 'BILL';

UPDATE public.internships 
SET application_link = 'https://nelnet.wd1.myworkdayjobs.com/en-US/MyNelnet/job/XMLNAME-2026-Summer-Intern---IT-Software-Engineer---NET-Web_R21663/apply/applyManually'
WHERE company = 'Nelnet';

UPDATE public.internships 
SET application_link = 'https://www.databricks.com/company/careers/university-recruiting/software-engineering-intern-2026-6865687002'
WHERE company = 'Databricks';

UPDATE public.internships 
SET application_link = 'https://careers.veeam.com/job/georgia/integrations-software-developer-intern-summer-2026/22681/85966505040'
WHERE company = 'Veeam';