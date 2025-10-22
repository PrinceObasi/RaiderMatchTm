-- Create a secrets table to store the hook secret
CREATE TABLE IF NOT EXISTS public.app_secrets (
  key text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_secrets ENABLE ROW LEVEL SECURITY;

-- Only service role can read secrets
CREATE POLICY "Service role can read secrets"
  ON public.app_secrets
  FOR SELECT
  TO service_role
  USING (true);

-- Insert the hook secret
INSERT INTO public.app_secrets (key, value)
VALUES ('hook_secret', 'a8c0e9b3b7eb56ae76a0a0479ae1cf07d2b788bf9b10ffa85ff7896c6280b316')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

-- Update the send_welcome_email function to read from the secrets table
CREATE OR REPLACE FUNCTION public.send_welcome_email()
RETURNS trigger
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
  -- Get user email from auth.users
  SELECT email INTO v_email
  FROM auth.users
  WHERE id = NEW.user_id;
  
  -- Get user name from students table if available
  SELECT name INTO v_name
  FROM public.students
  WHERE user_id = NEW.user_id;
  
  -- Get hook secret from secrets table
  SELECT value INTO v_hook_secret
  FROM public.app_secrets
  WHERE key = 'hook_secret';
  
  -- Skip if no secret is configured
  IF v_hook_secret IS NULL OR v_hook_secret = '' THEN
    RAISE NOTICE 'HOOK_SECRET not configured, skipping welcome email';
    RETURN NEW;
  END IF;

  -- Make async HTTP POST request to send-welcome edge function
  PERFORM
    extensions.http_post(
      url := v_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-hook-secret', v_hook_secret
      ),
      body := jsonb_build_object(
        'to', v_email,
        'name', COALESCE(v_name, 'Student')
      )::text,
      timeout_milliseconds := 8000
    );

  RAISE NOTICE 'Welcome email queued for: % (%)', COALESCE(v_name, 'Student'), v_email;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to queue welcome email for %: %', v_email, SQLERRM;
    RETURN NEW;
END;
$$;