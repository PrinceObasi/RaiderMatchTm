-- Fix security issues by setting proper search_path for functions
DROP FUNCTION IF EXISTS public.update_updated_at_column();
DROP FUNCTION IF EXISTS public.check_ttu_domain();

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