create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
declare
  existing_job bigint;
begin
  select jobid
  into existing_job
  from cron.job
  where jobname = 'weekly-ppm-report-monday-8am'
  limit 1;

  if existing_job is not null then
    perform cron.unschedule(existing_job);
  end if;
end $$;

select cron.schedule(
  'weekly-ppm-report-monday-8am',
  '0 5 * * 1',
  $$
    select net.http_post(
      url := 'https://vmfyfqxfakqsooprptsj.supabase.co/functions/v1/weekly-ppm-report',
      headers := '{"Content-Type":"application/json"}'::jsonb,
      body := '{"scheduled":true}'::jsonb,
      timeout_milliseconds := 30000
    );
  $$
);
