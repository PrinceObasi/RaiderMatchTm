-- Fix security issues by properly dropping triggers first, then functions, then recreating
DROP TRIGGER IF EXISTS update_students_updated_at ON public.students;
DROP TRIGGER IF EXISTS update_jobs_updated_at ON public.jobs;
DROP TRIGGER IF EXISTS ttu_domain_enforcer ON auth.users;

DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.check_ttu_domain() CASCADE;

-- Recreate check_ttu_domain function with proper search_path
CREATE OR REPLACE FUNCTION public.check_ttu_domain()
RETURNS trigger
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = ''
AS $$
BEGIN
  IF new.email NOT LIKE '%@ttu.edu' THEN
    RAISE EXCEPTION 'INVALID_DOMAIN';
  END IF;
  RETURN new;
END;
$$;

-- Recreate update_updated_at_column function with proper search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Recreate the triggers
CREATE TRIGGER ttu_domain_enforcer
BEFORE INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.check_ttu_domain();

CREATE TRIGGER update_students_updated_at
    BEFORE UPDATE ON public.students
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at
    BEFORE UPDATE ON public.jobs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();