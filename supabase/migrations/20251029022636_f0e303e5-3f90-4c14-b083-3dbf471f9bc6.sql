-- Enable RLS on tech_tags table
ALTER TABLE tech_tags ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to view canonical tags
CREATE POLICY "Anyone can view tech tags"
ON tech_tags
FOR SELECT
TO authenticated
USING (true);

-- Only service role can manage tech tags
CREATE POLICY "Service role can manage tech tags"
ON tech_tags
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);