-- Add GIN index for tech_stack array searches (if not exists)
CREATE INDEX IF NOT EXISTS idx_internships_techstack ON public.internships USING GIN (tech_stack);

-- Add index for finding rows that need enrichment
CREATE INDEX IF NOT EXISTS idx_internships_needs_enrichment ON public.internships (id) 
WHERE summary_text IS NULL;