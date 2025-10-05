-- Add enrichment columns to internships table
ALTER TABLE public.internships
  ADD COLUMN IF NOT EXISTS locations text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS work_mode text,
  ADD COLUMN IF NOT EXISTS requirements text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS responsibilities text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS description_html text,
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'simplify',
  ADD COLUMN IF NOT EXISTS source_url text;

-- Add index for enrichment queries
CREATE INDEX IF NOT EXISTS idx_internships_source ON public.internships(source);
CREATE INDEX IF NOT EXISTS idx_internships_enriched_at ON public.internships(enriched_at) WHERE enriched_at IS NOT NULL;