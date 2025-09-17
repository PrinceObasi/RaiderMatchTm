-- Create application_events table for background logging
CREATE TABLE IF NOT EXISTS public.application_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  internship_id UUID,
  user_id UUID,
  application_url TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.application_events ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can insert their own application events" 
ON public.application_events 
FOR INSERT 
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can view their own application events" 
ON public.application_events 
FOR SELECT 
USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_application_events_user_id ON public.application_events(user_id);
CREATE INDEX IF NOT EXISTS idx_application_events_internship_id ON public.application_events(internship_id);
CREATE INDEX IF NOT EXISTS idx_application_events_created_at ON public.application_events(created_at);