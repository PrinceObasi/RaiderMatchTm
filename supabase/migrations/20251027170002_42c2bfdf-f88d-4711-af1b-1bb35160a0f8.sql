-- Update RLS policy to show all active internships
DROP POLICY IF EXISTS "Authenticated users can view internships" ON public.internships;

CREATE POLICY "Authenticated users can view active internships" 
ON public.internships 
FOR SELECT 
USING (is_active = true);