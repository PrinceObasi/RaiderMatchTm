-- ============================================================
-- Migration: Analytics tracking for RaiderMatch
-- Adds job_events, feedback tables and necessary indexes
-- ============================================================

-- 1) Create enum for class year (if not exists)
DO $$ BEGIN
  CREATE TYPE public.class_year AS ENUM ('freshman','sophomore','junior','senior','grad');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2) Add analytics fields to existing students table
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS class_year public.class_year,
ADD COLUMN IF NOT EXISTS resume_uploaded boolean DEFAULT false;

-- 3) Create job_events table for tracking engagement
CREATE TABLE IF NOT EXISTS public.job_events (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  internship_id uuid REFERENCES public.internships(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('view','apply_click','save')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on job_events
ALTER TABLE public.job_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for job_events
CREATE POLICY "Users can insert their own events"
ON public.job_events FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can view all events"
ON public.job_events FOR SELECT
USING (auth.role() = 'service_role');

-- 4) Create feedback table
CREATE TABLE IF NOT EXISTS public.feedback (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  internship_id uuid REFERENCES public.internships(id) ON DELETE CASCADE,
  feedback_type text NOT NULL CHECK (feedback_type IN ('thumbs_up','thumbs_down','bug','feature_request')),
  text text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on feedback
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- RLS policies for feedback
CREATE POLICY "Users can insert their own feedback"
ON public.feedback FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own feedback"
ON public.feedback FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Service role can view all feedback"
ON public.feedback FOR SELECT
USING (auth.role() = 'service_role');

-- 5) Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_job_events_internship_type 
ON public.job_events(internship_id, event_type);

CREATE INDEX IF NOT EXISTS idx_job_events_user 
ON public.job_events(user_id);

CREATE INDEX IF NOT EXISTS idx_job_events_created 
ON public.job_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_feedback_internship 
ON public.feedback(internship_id);

CREATE INDEX IF NOT EXISTS idx_feedback_user 
ON public.feedback(user_id);

-- 6) Trigger to ensure event_type is lowercase
CREATE OR REPLACE FUNCTION public.lowercase_event_type()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.event_type := lower(NEW.event_type);
  RETURN NEW;
END;
$$;

CREATE TRIGGER ensure_lowercase_event_type
BEFORE INSERT OR UPDATE ON public.job_events
FOR EACH ROW EXECUTE FUNCTION public.lowercase_event_type();