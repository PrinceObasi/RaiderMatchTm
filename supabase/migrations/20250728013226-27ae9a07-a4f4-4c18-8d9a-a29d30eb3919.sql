-- Enable pg_trgm extension for similarity matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create students table for storing user profiles and skills
CREATE TABLE IF NOT EXISTS public.students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  major TEXT,
  graduation_year INTEGER,
  skills TEXT[] DEFAULT '{}',
  resume_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create jobs table for internship postings
CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  city TEXT NOT NULL,
  description TEXT NOT NULL,
  skills TEXT[] NOT NULL DEFAULT '{}',
  type TEXT NOT NULL DEFAULT 'internship',
  posted_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deadline TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Students can view and update their own data
CREATE POLICY "Students can view their own data" 
ON public.students 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Students can update their own data" 
ON public.students 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Students can insert their own data" 
ON public.students 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- All authenticated users can view jobs
CREATE POLICY "All users can view jobs" 
ON public.jobs 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_students_updated_at
    BEFORE UPDATE ON public.students
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at
    BEFORE UPDATE ON public.jobs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Seed real internship data
INSERT INTO public.jobs (title, company, city, description, skills, deadline) VALUES
(
  'Software Engineering Intern - Summer 2025',
  'Microsoft',
  'Austin, TX',
  'Join our team to work on cutting-edge cloud technologies. You will develop scalable software solutions, collaborate with senior engineers, and contribute to products used by millions of users worldwide. This internship offers hands-on experience with Azure services, microservices architecture, and modern development practices.',
  ARRAY['JavaScript', 'TypeScript', 'React', 'Node.js', 'Azure', 'SQL', 'Git', 'REST APIs', 'Agile'],
  '2025-03-15'::timestamp
),
(
  'Data Science Intern',
  'IBM',
  'Dallas, TX',
  'Work with our data science team to develop machine learning models and analyze large datasets. You will gain experience with statistical analysis, predictive modeling, and data visualization. Perfect opportunity to apply your academic knowledge to real-world business problems in AI and analytics.',
  ARRAY['Python', 'R', 'SQL', 'Machine Learning', 'Pandas', 'NumPy', 'Scikit-learn', 'TensorFlow', 'Tableau', 'Statistics'],
  '2025-02-28'::timestamp
),
(
  'Cybersecurity Intern',
  'Lockheed Martin',
  'Fort Worth, TX',
  'Support our cybersecurity team in protecting critical infrastructure and defense systems. You will learn about threat detection, vulnerability assessment, and security protocols. Gain hands-on experience with security tools and contribute to protecting national security interests.',
  ARRAY['Network Security', 'Python', 'Linux', 'Penetration Testing', 'SIEM', 'Wireshark', 'Incident Response', 'Risk Assessment'],
  '2025-04-01'::timestamp
),
(
  'Full-Stack Development Intern',
  'AT&T',
  'Plano, TX',
  'Develop end-to-end web applications and mobile solutions for our telecommunications platform. Work with modern frameworks and cloud technologies while learning from experienced developers. Contribute to applications that serve millions of customers across the nation.',
  ARRAY['React', 'Angular', 'Node.js', 'Express', 'MongoDB', 'PostgreSQL', 'AWS', 'Docker', 'Kubernetes', 'CI/CD'],
  '2025-03-30'::timestamp
),
(
  'UX/UI Design Intern - Technology',
  'Dell Technologies',
  'Round Rock, TX',
  'Join our design team to create intuitive user experiences for enterprise technology products. You will work on user research, wireframing, prototyping, and visual design. Collaborate with product managers and engineers to deliver user-centered design solutions.',
  ARRAY['Figma', 'Adobe Creative Suite', 'User Research', 'Prototyping', 'HTML', 'CSS', 'JavaScript', 'Design Systems', 'Usability Testing'],
  '2025-03-20'::timestamp
);