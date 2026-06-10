-- Add company_logo field to jobs table
ALTER TABLE public.jobs
ADD COLUMN company_logo text;

-- Add comment to describe the field
COMMENT ON COLUMN public.jobs.company_logo IS 'URL to company logo image';