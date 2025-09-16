-- Add internship support to existing applications table
ALTER TABLE public.applications 
ADD COLUMN internship_id uuid REFERENCES public.internships(id) ON DELETE CASCADE;

-- Add constraint to ensure either job_id or internship_id is set, but not both
ALTER TABLE public.applications 
ADD CONSTRAINT applications_job_or_internship_check 
CHECK (
  (job_id IS NOT NULL AND internship_id IS NULL) OR 
  (job_id IS NULL AND internship_id IS NOT NULL)
);

-- Add unique constraint for internship applications  
ALTER TABLE public.applications 
ADD CONSTRAINT applications_user_internship_unique 
UNIQUE (user_id, internship_id);

-- Add missing columns for better tracking
ALTER TABLE public.applications 
ADD COLUMN last_updated_at timestamptz NOT NULL DEFAULT now(),
ADD COLUMN note text;

-- Update the status column to use proper enum values
ALTER TABLE public.applications 
ADD CONSTRAINT applications_status_check 
CHECK (status IN ('applied', 'interview', 'offer', 'rejected', 'withdrawn'));

-- Create index for internship applications
CREATE INDEX idx_applications_user_internship_updated 
ON public.applications (user_id, last_updated_at DESC) 
WHERE internship_id IS NOT NULL;