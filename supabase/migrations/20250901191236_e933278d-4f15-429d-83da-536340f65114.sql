-- Enable Row Level Security on internships table
ALTER TABLE public.internships ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for internships table
-- Allow authenticated users to read all internships
CREATE POLICY "Anyone can view internships" ON public.internships
  FOR SELECT USING (true);

-- Only allow service role to insert/update/delete internships (for data management)
CREATE POLICY "Service role can manage internships" ON public.internships
  FOR ALL USING (auth.role() = 'service_role');

-- Fix the set_updated_at function security by setting search_path
CREATE OR REPLACE FUNCTION public.set_updated_at() 
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN 
  NEW.updated_at = now(); 
  RETURN NEW; 
END;
$$;