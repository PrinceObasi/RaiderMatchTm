-- Create improved matching function with weighted scoring
-- This replaces basic keyword overlap with sophisticated weighted algorithm

CREATE OR REPLACE FUNCTION public.match_internships_weighted(
  student_skills text[], 
  student_gpa numeric DEFAULT 0,
  student_year integer DEFAULT 2025,
  has_prev_intern boolean DEFAULT false,
  is_international boolean DEFAULT false,
  max_results integer DEFAULT 10
)
RETURNS TABLE(
  id uuid, 
  title text, 
  company text, 
  city text, 
  description text, 
  skills text[], 
  weighted_score numeric,
  skill_match_score numeric,
  gpa_score numeric,
  experience_score numeric,
  recency_score numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public, pg_temp'
AS $$
DECLARE
  skill_weight numeric := 0.5;    -- 50% weight on skill matching
  gpa_weight numeric := 0.2;      -- 20% weight on GPA requirements  
  experience_weight numeric := 0.2; -- 20% weight on experience level
  recency_weight numeric := 0.1;  -- 10% weight on job posting recency
BEGIN
  RETURN QUERY
  SELECT 
    j.id,
    j.title,
    j.company,
    j.city,
    j.description,
    j.skills,
    -- Calculate weighted total score
    (
      skill_match * skill_weight + 
      gpa_match * gpa_weight + 
      experience_match * experience_weight + 
      recency_match * recency_weight
    ) as weighted_score,
    skill_match as skill_match_score,
    gpa_match as gpa_score,
    experience_match as experience_score,
    recency_match as recency_score
  FROM (
    SELECT 
      j.*,
      -- 1. Skill Matching Score (0-1)
      CASE 
        WHEN array_length(j.skills, 1) = 0 THEN 0
        ELSE (
          SELECT COUNT(*)::numeric / array_length(j.skills, 1)
          FROM unnest(j.skills) AS job_skill
          WHERE job_skill = ANY(student_skills)
        )
      END as skill_match,
      
      -- 2. GPA Score (0-1) - higher GPA gets better score, but diminishing returns
      CASE 
        WHEN student_gpa >= 3.7 THEN 1.0
        WHEN student_gpa >= 3.5 THEN 0.9
        WHEN student_gpa >= 3.3 THEN 0.8
        WHEN student_gpa >= 3.0 THEN 0.7
        WHEN student_gpa >= 2.7 THEN 0.6
        WHEN student_gpa >= 2.5 THEN 0.5
        ELSE 0.3
      END as gpa_match,
      
      -- 3. Experience Score (0-1) - entry level vs experienced internships
      CASE 
        WHEN has_prev_intern = true THEN 1.0
        WHEN j.title ILIKE '%entry%' OR j.title ILIKE '%junior%' OR j.description ILIKE '%no experience%' THEN 1.0
        WHEN j.description ILIKE '%previous intern%' OR j.description ILIKE '%experience required%' THEN 0.7
        ELSE 0.85  -- neutral for most internships
      END as experience_match,
      
      -- 4. Recency Score (0-1) - prefer recently posted jobs
      CASE 
        WHEN j.posted_date >= current_date - interval '7 days' THEN 1.0
        WHEN j.posted_date >= current_date - interval '14 days' THEN 0.9
        WHEN j.posted_date >= current_date - interval '30 days' THEN 0.8
        WHEN j.posted_date >= current_date - interval '60 days' THEN 0.6
        ELSE 0.4
      END as recency_match
      
    FROM public.jobs j
    WHERE 
      j.title ILIKE '%intern%'
      AND j.opens_at <= current_date
      AND (j.closes_at IS NULL OR j.closes_at >= current_date)
      AND j.is_active = true
      AND (
        is_international = false             -- domestic: see all
        OR (is_international = true          -- intl: only when sponsor
            AND j.sponsors_visa = true)
      )
  ) scored_jobs
  WHERE skill_match > 0  -- Only include jobs with at least some skill overlap
  ORDER BY weighted_score DESC, skill_match DESC
  LIMIT max_results;
END;
$$;

-- Create a wrapper function that maintains backward compatibility
CREATE OR REPLACE FUNCTION public.match_internships_v2(
  student_skills text[], 
  is_international boolean DEFAULT false
)
RETURNS TABLE(
  id uuid, 
  title text, 
  company text, 
  city text, 
  description text, 
  skills text[], 
  similarity double precision
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public, pg_temp'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mw.id,
    mw.title,
    mw.company,
    mw.city,
    mw.description,
    mw.skills,
    mw.weighted_score::double precision as similarity
  FROM public.match_internships_weighted(
    student_skills, 
    0, -- default GPA
    2025, -- default year
    false, -- default no previous intern
    is_international,
    10 -- default max results
  ) mw;
END;
$$;

-- Add comment explaining the improvement
COMMENT ON FUNCTION public.match_internships_weighted IS 
'Advanced matching function with weighted scoring algorithm that considers:
1. Skill overlap (50% weight)
2. GPA compatibility (20% weight)  
3. Experience level match (20% weight)
4. Job posting recency (10% weight)';