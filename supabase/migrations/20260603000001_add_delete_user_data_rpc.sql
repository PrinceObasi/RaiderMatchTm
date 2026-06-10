-- Atomic user data deletion function
-- Called by the delete-account edge function to ensure all-or-nothing cleanup

CREATE OR REPLACE FUNCTION public.delete_user_data(p_user_id uuid, p_user_type text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_user_type = 'student' THEN
    -- Delete applications first (FK dependency)
    DELETE FROM public.applications WHERE user_id = p_user_id;
    -- Delete student profile
    DELETE FROM public.students WHERE user_id = p_user_id;

  ELSIF p_user_type = 'employer' THEN
    -- Delete applications for employer's jobs
    DELETE FROM public.applications
    WHERE job_id IN (SELECT id FROM public.jobs WHERE employer_id = p_user_id);
    -- Delete employer's jobs
    DELETE FROM public.jobs WHERE employer_id = p_user_id;

  ELSE
    RAISE EXCEPTION 'Invalid user type: %', p_user_type
      USING ERRCODE = '22023'; -- invalid_parameter_value
  END IF;
END;
$$;

-- Only authenticated users can call this
GRANT EXECUTE ON FUNCTION public.delete_user_data(uuid, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_user_data(uuid, text) FROM anon;
