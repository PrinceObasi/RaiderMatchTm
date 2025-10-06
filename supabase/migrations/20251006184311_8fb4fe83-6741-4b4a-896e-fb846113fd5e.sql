-- Remove Simplify dependencies and enforce direct links only

-- Update all existing records to use direct_link as application_link
UPDATE internships 
SET application_link = direct_link 
WHERE direct_link IS NOT NULL AND direct_link != '';

-- Remove any records that don't have a direct link
DELETE FROM internships 
WHERE direct_link IS NULL OR direct_link = '';

-- Drop the simplify_url column if it exists
ALTER TABLE internships 
DROP COLUMN IF EXISTS simplify_url;

-- Make direct_link required (set NOT NULL)
ALTER TABLE internships 
ALTER COLUMN direct_link SET NOT NULL;

-- Update is_direct to always be true for all records
UPDATE internships SET is_direct = true WHERE is_direct IS NULL OR is_direct = false;

-- Update link_type to always be 'direct' for all records
UPDATE internships SET link_type = 'direct' WHERE link_type IS NULL OR link_type != 'direct';