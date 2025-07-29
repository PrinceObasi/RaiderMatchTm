-- Create a trigger function to notify employer when a new application is created
CREATE OR REPLACE FUNCTION public.notify_employer()
RETURNS trigger AS $$
BEGIN
  -- Call the edge function asynchronously
  PERFORM
    net.http_post(
      url := 'https://tjahvypvfrjulnqmnhsh.supabase.co/functions/v1/notify_employer',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}'::jsonb,
      body := json_build_object('record', NEW)::text
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trg_notify_employer ON public.applications;

-- Create trigger that fires after insert on applications
CREATE TRIGGER trg_notify_employer
  AFTER INSERT ON public.applications
  FOR EACH ROW 
  EXECUTE FUNCTION public.notify_employer();