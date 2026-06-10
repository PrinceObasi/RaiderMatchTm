-- Applications table
CREATE TABLE public.applications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL,
  job_id     uuid REFERENCES public.jobs(id) ON DELETE CASCADE,
  applied_at timestamp with time zone DEFAULT now(),
  status     text DEFAULT 'applied'
);

-- Enable RLS
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- Owner-only RLS policy
CREATE POLICY "Owner can do everything"
  ON public.applications
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);