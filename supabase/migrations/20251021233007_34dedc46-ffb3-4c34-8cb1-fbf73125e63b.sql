-- Enable pg_net extension for making HTTP requests from Postgres
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create function to send welcome email when a student signs up
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
  v_hook_secret text;
BEGIN
  -- Get the hook secret from environment
  v_hook_secret := current_setting('app.settings.hook_secret', true);
  
  -- Get email and name from the new student record
  v_email := NEW.email;
  v_name := NEW.name;

  -- Make async HTTP POST request to send-welcome edge function
  PERFORM
    extensions.http_post(
      url := v_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-hook-secret', COALESCE(v_hook_secret, '')
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

-- Create trigger on students table to fire after insert
DROP TRIGGER IF EXISTS tr_students_welcome_email ON public.students;
CREATE TRIGGER tr_students_welcome_email
  AFTER INSERT ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION public.send_welcome_email();

-- Comment for documentation
COMMENT ON FUNCTION public.send_welcome_email() IS 'Sends a welcome email to new students via the send-welcome edge function';
COMMENT ON TRIGGER tr_students_welcome_email ON public.students IS 'Automatically sends welcome email when a new student record is created';
