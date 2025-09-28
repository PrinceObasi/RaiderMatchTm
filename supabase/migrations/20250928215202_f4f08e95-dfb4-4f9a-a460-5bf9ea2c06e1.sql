-- Set up cron job to automatically process direct links every hour
SELECT cron.schedule(
  'extract-direct-links-hourly',
  '0 * * * *',
  $$
    SELECT net.http_post(
      url := 'https://tjahvypvfrjulnqmnhsh.supabase.co/functions/v1/extract-direct-links',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object('batch_size', 50)
    );
  $$
);