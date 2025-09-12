-- Create example_resumes table
CREATE TABLE public.example_resumes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_name TEXT NOT NULL,
  company TEXT NOT NULL,
  position TEXT NOT NULL,
  major TEXT NOT NULL,
  graduation_year INTEGER NOT NULL,
  resume_url TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.example_resumes ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Anyone can view example resumes" 
ON public.example_resumes 
FOR SELECT 
USING (true);

-- Insert 3 example resumes
INSERT INTO public.example_resumes (student_name, company, position, major, graduation_year, resume_url, description) VALUES
('Alex M.', 'Amazon', 'Software Engineer Intern', 'Computer Science', 2023, 'https://tjahvypvfrjulnqmnhsh.supabase.co/storage/v1/object/public/resumes/examples/alex-amazon-resume.pdf', 'Secured Amazon internship with strong projects in Python, React, and AWS. Built scalable web applications and contributed to cloud infrastructure.'),
('Sarah K.', 'Meta', 'Software Engineer Intern', 'Computer Science', 2024, 'https://tjahvypvfrjulnqmnhsh.supabase.co/storage/v1/object/public/resumes/examples/sarah-meta-resume.pdf', 'Landed Meta internship focusing on React Native and GraphQL. Developed mobile applications with millions of users.'),
('David L.', 'Microsoft', 'Software Engineer Intern', 'Computer Engineering', 2023, 'https://tjahvypvfrjulnqmnhsh.supabase.co/storage/v1/object/public/resumes/examples/david-microsoft-resume.pdf', 'Joined Microsoft with expertise in C#, .NET, and Azure. Worked on enterprise-scale cloud solutions and AI integrations.');