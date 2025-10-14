-- Add trigger to keep summary_text and description_text in sync, and backfill existing rows
DO $$
BEGIN
  -- Create or replace trigger to sync summary_text and description_text
  IF EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_sync_summary_description'
  ) THEN
    DROP TRIGGER trg_sync_summary_description ON public.internships;
  END IF;

  CREATE TRIGGER trg_sync_summary_description
  BEFORE INSERT OR UPDATE ON public.internships
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_summary_and_description();
END $$;

-- One-time backfill to populate description_text where empty from summary_text
UPDATE public.internships
SET description_text = summary_text,
    updated_at = now()
WHERE (description_text IS NULL OR description_text = '')
  AND summary_text IS NOT NULL;