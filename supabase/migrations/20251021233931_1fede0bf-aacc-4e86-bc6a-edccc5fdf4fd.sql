-- Update send_welcome_email to authenticate using Service Role token instead of DB setting for hook secret
CREATE OR REPLACE FUNCTION public.send_welcome_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_name text;
  v_url text := 'https://tjahvypvfrjulnqmnhsh.supabase.co/functions/v1/send-welcome';
  v_service_key text;
BEGIN
  -- Get email and name from the new student record
  v_email := NEW.email;
  v_name := NEW.name;

  -- Read the service role key exposed to Postgres via settings
  v_service_key := current_setting('app.settings.service_role_key', true);

  -- Make async HTTP POST request to send-welcome edge function
  PERFORM
    extensions.http_post(
      url := v_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || COALESCE(v_service_key, '')
      ),
      body := jsonb_build_object(
        'to', v_email,
        'name', v_name
      )::text,
      timeout_milliseconds := 8000
    );

  -- Log the attempt
  RAISE NOTICE 'Welcome email queued for: % (%)', v_name, v_email;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't block the insert
    RAISE WARNING 'Failed to queue welcome email for %: %', v_email, SQLERRM;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.send_welcome_email() IS 'Sends a welcome email to new students via the send-welcome edge function (auth via Service Role token)';