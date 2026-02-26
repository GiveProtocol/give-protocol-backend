-- Enable pg_net and pg_cron extensions for the attestation sweep job.
-- pg_cron and pg_net are pre-installed on Supabase hosted projects.
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Schedule a batch sweep every 5 minutes to attest any pending/failed donations.
-- Calls the attest-fiat-donation edge function with an empty body (batch mode).
SELECT cron.schedule(
  'attest-fiat-donations-sweep',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/attest-fiat-donation',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
