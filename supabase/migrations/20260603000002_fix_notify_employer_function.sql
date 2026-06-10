-- Fix notify_employer trigger function:
-- 1. Use dynamic Supabase URL from config instead of hardcoded URL
-- 2. Use supabase_url() helper if available, or current_setting for URL
-- 3. Keep service_role_key usage (required for trigger-to-edge-function calls)
--    but document the risk and use the standard Supabase config path

CREATE OR REPLACE FUNCTION public.notify_employer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  payload jsonb;
  supabase_url text;
  service_key text;
BEGIN
  -- Build minimal payload (avoid leaking full row data)
  payload := jsonb_build_object(
    'record', jsonb_build_object(
      'user_id', NEW.user_id,
      'job_id', NEW.job_id,
      'hire_score', NEW.hire_score
    )
  );

  -- Get URL and key from Supabase-managed settings
  supabase_url := current_setting('app.settings.supabase_url', true);
  service_key := current_setting('app.settings.service_role_key', true);

  -- Only attempt notification if both settings are available
  IF supabase_url IS NOT NULL AND service_key IS NOT NULL THEN
    PERFORM
      net.http_post(
        url := supabase_url || '/functions/v1/notify_employer',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_key
        ),
        body := payload::text
      );
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log but never block the insert
    RAISE NOTICE 'notify_employer failed: %', SQLERRM;
    RETURN NEW;
END;
$$;
