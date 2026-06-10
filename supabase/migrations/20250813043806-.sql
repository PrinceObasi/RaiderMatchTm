-- Fix remaining functions with mutable search_path

-- Fix the update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public, pg_temp'
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Fix the check_ttu_domain function  
CREATE OR REPLACE FUNCTION public.check_ttu_domain()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public, pg_temp'
AS $$
BEGIN
  -- Apply the domain rule **only** if role == 'student'
  IF (NEW.raw_user_meta_data ->> 'role') = 'student' THEN
    IF NEW.email !~* '@ttu\.edu$' THEN
      RAISE EXCEPTION 'INVALID_DOMAIN: students must use @ttu.edu';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Fix the match_internships functions (both overloads)
CREATE OR REPLACE FUNCTION public.match_internships(student_skills text[], is_international boolean DEFAULT false)
RETURNS TABLE(id uuid, title text, company text, city text, description text, skills text[], similarity double precision)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public, pg_temp'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    j.id,
    j.title,
    j.company,
    j.city,
    j.description,
    j.skills,
    similarity(
      array_to_string(j.skills, ' '),
      array_to_string(student_skills, ' ')
    ) AS similarity
  FROM public.jobs j
  WHERE j.title ILIKE '%intern%'
    AND j.opens_at <= current_date
    AND (j.closes_at IS NULL OR j.closes_at >= current_date)
    AND j.is_active = true
    AND (
      is_international = false             -- domestic: see all
      OR (is_international = true          -- intl: only when sponsor
          AND j.sponsors_visa = true)
    )
  ORDER BY similarity DESC
  LIMIT 10;
END;
$$;

CREATE OR REPLACE FUNCTION public.match_internships(student_skills text[])
RETURNS TABLE(id uuid, title text, company text, city text, description text, skills text[], similarity double precision)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public, pg_temp'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    j.id,
    j.title,
    j.company,
    j.city,
    j.description,
    j.skills,
    similarity(
      array_to_string(j.skills, ' '),
      array_to_string(student_skills, ' ')
    ) AS similarity
  FROM public.jobs j
  WHERE j.title ILIKE '%intern%'
    AND j.opens_at <= current_date
    AND (j.closes_at IS NULL OR j.closes_at >= current_date)
  ORDER BY similarity DESC
  LIMIT 5;
END;
$$;

-- Fix the notify_employer function
CREATE OR REPLACE FUNCTION public.notify_employer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public, pg_temp'
AS $$
DECLARE
  payload jsonb;
BEGIN
  -- Safer: convert the whole NEW row to jsonb
  payload := jsonb_build_object('record', row_to_json(NEW));

  PERFORM
    net.http_post(
      url := 'https://tjahvypvfrjulnqmnhsh.supabase.co/functions/v1/notify_employer',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}'::jsonb,
      body := payload::text
    );
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log but don't block the insert
    RAISE NOTICE 'notify_employer failed: %', SQLERRM;
    RETURN NEW;
END;
$$;