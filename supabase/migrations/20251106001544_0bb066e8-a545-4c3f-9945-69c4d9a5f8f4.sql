-- Ensure enrichment tracking columns exist
ALTER TABLE public.internships
ADD COLUMN IF NOT EXISTS enrichment_attempts integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS enrichment_confidence integer,
ADD COLUMN IF NOT EXISTS notes text;

-- Function to select internships that need enrichment
-- Only returns active internships with missing data and < 3 failed attempts
CREATE OR REPLACE FUNCTION public.get_internships_needing_enrichment(p_limit int)
RETURNS SETOF public.internships
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT *
  FROM public.internships
  WHERE
    COALESCE(is_active, false) = true
    AND (
      -- missing or blank summary / description
      COALESCE(
        NULLIF(trim(summary_text), ''),
        NULLIF(trim(description_text), '')
      ) IS NULL
      OR tech_stack IS NULL
      OR array_length(tech_stack, 1) = 0
    )
    AND COALESCE(enrichment_attempts, 0) < 3  -- skip 3+ failed attempts
  ORDER BY
    date_posted DESC NULLS LAST,
    created_at DESC NULLS LAST
  LIMIT LEAST(p_limit, 50);
$$;