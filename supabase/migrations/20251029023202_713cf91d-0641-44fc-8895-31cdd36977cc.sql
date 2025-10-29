-- Add line counter column
ALTER TABLE internships
ADD COLUMN IF NOT EXISTS summary_line_count int
GENERATED ALWAYS AS (1 + regexp_count(COALESCE(summary_text,''), E'\n')) STORED;

-- Add review tracking columns
ALTER TABLE internships
ADD COLUMN IF NOT EXISTS needs_review boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS review_reason text[];

-- Flag summaries that need review based on quality criteria
UPDATE internships
SET needs_review = true,
    review_reason = array_remove(
      ARRAY[
        CASE WHEN summary_line_count < 3 OR summary_line_count > 4 THEN 'lines_out_of_range' END,
        CASE WHEN length(summary_text) < 180 THEN 'summary_too_short' END,
        CASE WHEN length(summary_text) > 350 THEN 'summary_too_long' END,
        CASE WHEN summary_text ~* '(fast-paced|world-class|dynamic environment|innovative|cutting-edge|exciting)' THEN 'fluff' END,
        CASE WHEN COALESCE(cardinality(tech_stack), 0) < 3 THEN 'stack_too_short' END,
        CASE WHEN COALESCE(cardinality(tech_stack), 0) > 12 THEN 'stack_too_long' END,
        CASE WHEN enrichment_confidence < 60 THEN 'low_conf' END
      ],
      NULL
    )
WHERE is_active = true 
  AND summary_text IS NOT NULL;