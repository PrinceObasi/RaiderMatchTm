-- Add columns for direct link tracking
ALTER TABLE internships 
ADD COLUMN IF NOT EXISTS direct_link TEXT,
ADD COLUMN IF NOT EXISTS link_type TEXT DEFAULT 'redirect',
ADD COLUMN IF NOT EXISTS link_extracted_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS extraction_attempts INTEGER DEFAULT 0;

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_direct_link_extraction 
ON internships(scrape_source, direct_link, extraction_attempts)
WHERE application_link IS NOT NULL;