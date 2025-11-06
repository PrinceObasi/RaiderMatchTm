-- Add enrichment_attempts column to track retry attempts
ALTER TABLE public.internships 
ADD COLUMN IF NOT EXISTS enrichment_attempts integer DEFAULT 0;