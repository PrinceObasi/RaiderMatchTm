-- Remove hardware engineering postings
UPDATE internships 
SET is_active = false, 
    archived_at = now()
WHERE is_active = true 
  AND (
    role_title ILIKE '%hardware%engineer%' 
    OR role_title ILIKE '%hardware engineer%'
    OR description_text ILIKE '%hardware engineer%'
    OR summary_text ILIKE '%hardware engineer%'
  );

-- Identify and mark duplicates (keeping the earliest created record)
WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY company, role_title, location 
      ORDER BY created_at ASC
    ) as rn
  FROM internships
  WHERE is_active = true
)
UPDATE internships i
SET is_active = false,
    archived_at = now(),
    duplicate_of = (
      SELECT id 
      FROM duplicates d2 
      WHERE d2.rn = 1 
        AND EXISTS (
          SELECT 1 
          FROM internships i2 
          WHERE i2.id = d2.id 
            AND i2.company = i.company 
            AND i2.role_title = i.role_title 
            AND i2.location = i.location
        )
      LIMIT 1
    )
FROM duplicates d
WHERE i.id = d.id 
  AND d.rn > 1
  AND i.is_active = true;