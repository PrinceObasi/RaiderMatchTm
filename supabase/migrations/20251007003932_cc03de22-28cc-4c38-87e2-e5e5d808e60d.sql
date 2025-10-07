-- Add enrichment columns to internships table
ALTER TABLE public.internships
  ADD COLUMN IF NOT EXISTS summary_text text,
  ADD COLUMN IF NOT EXISTS core_requirements text[] DEFAULT '{}';

-- Create partial index for rows needing enrichment
CREATE INDEX IF NOT EXISTS idx_internships_needs_summary
  ON public.internships (id)
  WHERE summary_text IS NULL;

CREATE INDEX IF NOT EXISTS idx_internships_needs_tech
  ON public.internships (id)
  WHERE cardinality(tech_stack) = 0;