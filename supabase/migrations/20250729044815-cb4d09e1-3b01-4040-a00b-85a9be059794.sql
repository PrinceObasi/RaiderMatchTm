-- Fix function search path security issue by setting search_path for the notify_employer function
CREATE OR REPLACE FUNCTION public.notify_employer()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;