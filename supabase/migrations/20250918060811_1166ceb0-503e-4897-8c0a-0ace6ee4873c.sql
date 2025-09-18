-- Enable RLS on skill_aliases table
ALTER TABLE public.skill_aliases ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read skill aliases (it's just a lookup table)
CREATE POLICY "Anyone can view skill aliases"
  ON public.skill_aliases FOR SELECT
  USING (true);

-- Fix search_path for security definer functions
CREATE OR REPLACE FUNCTION public.normalize_keywords(raw TEXT[])
RETURNS TEXT[] 
LANGUAGE sql 
IMMUTABLE 
SECURITY DEFINER
SET search_path = public
AS $$
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

CREATE OR REPLACE FUNCTION public.set_profile_keywords(p_user_id uuid, raw TEXT[])
RETURNS VOID 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, resume_keywords)
  VALUES (p_user_id, public.normalize_keywords(raw))
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    resume_keywords = public.normalize_keywords(raw),
    updated_at = now();
END; $$;

CREATE OR REPLACE FUNCTION public.set_job_keywords(p_job_id uuid, raw TEXT[])
RETURNS VOID 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.internships
  SET job_keywords = public.normalize_keywords(raw)
  WHERE id = p_job_id;
END; $$;

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
) 
LANGUAGE sql 
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
  WITH me AS (
    SELECT coalesce(resume_keywords,'{}'::text[]) AS kw
    FROM public.profiles WHERE user_id = p_user_id
  ),
  scored AS (
    SELECT i.*,
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