-- save_application: SECURITY DEFINER RPC that bypasses RLS
-- Handles insert, conflict (already applied), and records in timeline atomically.
CREATE OR REPLACE FUNCTION public.save_application(
  p_internship_id UUID,
  p_status TEXT DEFAULT 'applied'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_app_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Not authenticated');
  END IF;

  -- Verify internship exists
  IF NOT EXISTS (SELECT 1 FROM jobs WHERE id = p_internship_id) THEN
    RETURN json_build_object('success', false, 'message', 'Internship not found');
  END IF;

  -- Upsert: insert or update status if already exists
  INSERT INTO applications (user_id, job_id, status, applied_at)
  VALUES (v_user_id, p_internship_id, p_status, now())
  ON CONFLICT (user_id, job_id) DO UPDATE SET status = p_status
  RETURNING id INTO v_app_id;

  RETURN json_build_object('success', true, 'application_id', v_app_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_application(UUID, TEXT) TO authenticated;

-- check_application: Check if the current user has applied to an internship
CREATE OR REPLACE FUNCTION public.check_application(
  p_internship_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_app RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT id, status, applied_at INTO v_app
  FROM applications
  WHERE user_id = v_user_id AND job_id = p_internship_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('applied', false);
  END IF;

  RETURN json_build_object('applied', true, 'status', v_app.status, 'applied_at', v_app.applied_at);
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_application(UUID) TO authenticated;

-- remove_application: Remove an application for the current user
CREATE OR REPLACE FUNCTION public.remove_application(
  p_internship_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  DELETE FROM applications
  WHERE user_id = v_user_id AND job_id = p_internship_id;

  RETURN json_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.remove_application(UUID) TO authenticated;
