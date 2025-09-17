-- Clear existing example resumes and add the correct ones with PDFs
DELETE FROM example_resumes;

-- Add the three students with their resume PDFs
INSERT INTO example_resumes 
(student_name, company, position, major, graduation_year, description, resume_url, created_at)
VALUES 
(
  'Chris Carson',
  'Amazon',
  'Software Engineering Intern',
  'Computer Science',
  2026,
  'Secured Amazon internship with strong backend development skills in Java and Python. Built scalable web applications and led code reviews using modern development practices.',
  '/resumes/chris-carson-resume.pdf',
  now()
),
(
  'Damien Anderson',
  'Meta',
  'Software Engineering Intern',
  'Electrical & Computer Engineering',
  2027,
  'Landed Meta internship with expertise in full-stack development and embedded systems. Built responsive web applications and automated control systems.',
  '/resumes/damien-anderson-resume.pdf',
  now()
),
(
  'Chiamaka Enusi',
  'Amazon',
  'Software Engineering Intern',
  'Computer Science',
  2025,
  'Secured Amazon internship with strong research background and robotics experience. Developed innovative solutions for accessibility and digital systems.',
  '/resumes/chiamaka-enusi-resume.pdf',
  now()
);