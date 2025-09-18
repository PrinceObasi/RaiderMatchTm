-- A) Alias map for skill normalization
CREATE TABLE IF NOT EXISTS public.skill_aliases (
  alias TEXT PRIMARY KEY,
  canonical TEXT NOT NULL
);

INSERT INTO public.skill_aliases (alias, canonical) VALUES
  ('js','javascript'), ('ts','typescript'), ('node','node.js'),
  ('reactjs','react'), ('py','python'), ('postgres','postgresql'),
  ('postgre','postgresql'), ('c sharp','c#'), ('c plus plus','c++'),
  ('nodejs', 'node.js'), ('reactnative', 'react-native'), ('vue', 'vue.js'),
  ('angular', 'angular.js'), ('mysql', 'mysql'), ('mongodb', 'mongodb'),
  ('docker', 'docker'), ('kubernetes', 'k8s'), ('k8s', 'kubernetes'),
  ('aws', 'amazon-web-services'), ('gcp', 'google-cloud-platform'),
  ('azure', 'microsoft-azure'), ('git', 'git'), ('github', 'github'),
  ('gitlab', 'gitlab'), ('bitbucket', 'bitbucket'), ('jira', 'jira'),
  ('confluence', 'confluence'), ('slack', 'slack'), ('figma', 'figma'),
  ('sketch', 'sketch'), ('photoshop', 'adobe-photoshop'), ('illustrator', 'adobe-illustrator')
ON CONFLICT (alias) DO NOTHING;

-- B) Add profiles table if not exists (for resume keywords)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  resume_keywords TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add resume_keywords column to profiles if it doesn't exist
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS resume_keywords TEXT[] DEFAULT '{}';

-- C) Job keywords (derived from job description + tech_stack)  
ALTER TABLE public.internships
  ADD COLUMN IF NOT EXISTS job_keywords TEXT[] DEFAULT '{}';

-- D) Normalization helper (fold to lowercase, apply alias map, de-duplicate)
CREATE OR REPLACE FUNCTION public.normalize_keywords(raw TEXT[])
RETURNS TEXT[] LANGUAGE sql IMMUTABLE AS $$
  WITH tokens AS (
    SELECT DISTINCT lower(trim(t)) AS t
    FROM unnest(coalesce(raw,'{}'::text[])) AS t
    WHERE length(trim(t)) > 0
  ),
  mapped AS (
    SELECT COALESCE(sa.canonical, t.t) AS k
    FROM tokens t
    LEFT JOIN public.skill_aliases sa ON sa.alias = t.t
  )
  SELECT ARRAY(SELECT DISTINCT k FROM mapped WHERE k <> '' ORDER BY k);
$$;

-- E) Resume/job keyword setters
CREATE OR REPLACE FUNCTION public.set_profile_keywords(p_user_id uuid, raw TEXT[])
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Insert or update profile with keywords
  INSERT INTO public.profiles (user_id, resume_keywords)
  VALUES (p_user_id, public.normalize_keywords(raw))
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    resume_keywords = public.normalize_keywords(raw),
    updated_at = now();
END; $$;

CREATE OR REPLACE FUNCTION public.set_job_keywords(p_job_id uuid, raw TEXT[])
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.internships
  SET job_keywords = public.normalize_keywords(raw)
  WHERE id = p_job_id;
END; $$;

-- F) Matching RPC (order by overlap count; do not expose the count to UI)
CREATE OR REPLACE FUNCTION public.match_internships_for_user(
  p_user_id uuid,
  p_limit int DEFAULT 20,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  company text,
  role_title text,
  location text,
  tech_stack text[],
  visa_sponsorship visa_sponsorship_status,
  application_link text,
  date_posted date,
  deadline date
) LANGUAGE sql STABLE AS $$
  WITH me AS (
    SELECT coalesce(resume_keywords,'{}'::text[]) AS kw
    FROM public.profiles WHERE user_id = p_user_id
  ),
  scored AS (
    SELECT i.*,
           -- overlap size (not returned to client)
           cardinality( (SELECT ARRAY(
              SELECT DISTINCT x FROM unnest(coalesce(i.job_keywords, '{}'::text[])) x
              INTERSECT
              SELECT DISTINCT y FROM unnest((SELECT kw FROM me)) y
           )) ) AS overlap
    FROM public.internships i
    WHERE coalesce(i.is_texas, true) = true
  )
  SELECT s.id, s.company, s.role_title, s.location, s.tech_stack, s.visa_sponsorship, s.application_link, s.date_posted, s.deadline
  FROM scored s
  ORDER BY s.overlap DESC, coalesce(s.date_posted, now()::date) DESC
  LIMIT p_limit OFFSET p_offset;
$$;

-- Index for faster overlap (GIN on arrays)
CREATE INDEX IF NOT EXISTS idx_internships_job_keywords_gin
  ON public.internships USING GIN (job_keywords);

-- Index for profiles lookup
CREATE INDEX IF NOT EXISTS idx_profiles_user_id
  ON public.profiles (user_id);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE  
  USING (auth.uid() = user_id);

-- Trigger for updated_at on profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();