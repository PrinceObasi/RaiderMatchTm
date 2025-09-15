-- Create application_clicks table to track application attempts
CREATE TABLE public.application_clicks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  internship_id UUID NULL,
  job_id UUID NULL,
  apply_url TEXT NOT NULL,
  clicked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.application_clicks ENABLE ROW LEVEL SECURITY;

-- Create policies for application_clicks
CREATE POLICY "Users can view their own application clicks" 
ON public.application_clicks 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own application clicks" 
ON public.application_clicks 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_application_clicks_user_id ON public.application_clicks(user_id);
CREATE INDEX idx_application_clicks_internship_id ON public.application_clicks(internship_id);
CREATE INDEX idx_application_clicks_job_id ON public.application_clicks(job_id);