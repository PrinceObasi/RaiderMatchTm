-- Add validation tracking columns to internships table
ALTER TABLE internships 
ADD COLUMN IF NOT EXISTS link_valid BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS last_validated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS validation_message TEXT,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS scrape_source TEXT,
ADD COLUMN IF NOT EXISTS duplicate_of UUID REFERENCES internships(id);

-- Create index for efficient validation queries
CREATE INDEX IF NOT EXISTS idx_internships_validation 
ON internships(last_validated_at, is_active) 
WHERE application_link IS NOT NULL;

-- Create validation history table for tracking
CREATE TABLE IF NOT EXISTS internship_validation_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  internship_id UUID REFERENCES internships(id) ON DELETE CASCADE,
  validated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  was_valid BOOLEAN,
  status_code INTEGER,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on validation history table
ALTER TABLE internship_validation_history ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage validation history
CREATE POLICY "Service role can manage validation history" 
ON internship_validation_history 
FOR ALL 
USING (auth.role() = 'service_role');

-- Enable pg_cron extension for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule link validation to run every 6 hours
SELECT cron.schedule(
  'validate-internship-links',
  '0 */6 * * *', -- Every 6 hours
  $$
    SELECT net.http_post(
      url := 'https://tjahvypvfrjulnqmnhsh.supabase.co/functions/v1/validate-internship-links',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object('batch_size', 50)
    );
  $$
);