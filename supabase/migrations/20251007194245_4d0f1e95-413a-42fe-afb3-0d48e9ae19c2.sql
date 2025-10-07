-- Add description_text column to mirror summary_text
ALTER TABLE public.internships
ADD COLUMN IF NOT EXISTS description_text text;

-- Sync existing data: copy summary_text to description_text
UPDATE public.internships
SET description_text = summary_text
WHERE summary_text IS NOT NULL AND (description_text IS NULL OR description_text = '');

-- Create trigger function to keep both columns in sync
CREATE OR REPLACE FUNCTION public.sync_summary_and_description()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- If summary_text is set, copy to description_text
  IF NEW.summary_text IS NOT NULL AND (NEW.description_text IS NULL OR NEW.description_text = '') THEN
    NEW.description_text := NEW.summary_text;
  -- If description_text is set, copy to summary_text
  ELSIF NEW.description_text IS NOT NULL AND (NEW.summary_text IS NULL OR NEW.summary_text = '') THEN
    NEW.summary_text := NEW.description_text;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to auto-sync on insert/update
DROP TRIGGER IF EXISTS trg_sync_summary ON public.internships;
CREATE TRIGGER trg_sync_summary
BEFORE INSERT OR UPDATE ON public.internships
FOR EACH ROW
EXECUTE FUNCTION public.sync_summary_and_description();