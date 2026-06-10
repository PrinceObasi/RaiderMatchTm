-- Fix notify_employer trigger to prevent invalid JSON from aborting application inserts
CREATE OR REPLACE FUNCTION public.notify_employer()
RETURNS trigger AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;