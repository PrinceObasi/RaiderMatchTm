-- Add enrichment fields to internships table
ALTER TABLE public.internships
  ADD COLUMN IF NOT EXISTS jd_raw text,
  ADD COLUMN IF NOT EXISTS jd_summary text,
  ADD COLUMN IF NOT EXISTS salary_min numeric,
  ADD COLUMN IF NOT EXISTS salary_max numeric,
  ADD COLUMN IF NOT EXISTS salary_currency text DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS salary_period text,      -- 'hour','year','month','week' or null
  ADD COLUMN IF NOT EXISTS enrichment_confidence int, -- 0-100
  ADD COLUMN IF NOT EXISTS enriched_at timestamptz;

-- Create index for better performance on enriched data queries
CREATE INDEX IF NOT EXISTS idx_internships_enriched_at ON public.internships(enriched_at DESC);