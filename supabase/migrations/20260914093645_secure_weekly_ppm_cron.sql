do $$
declare
  job_id bigint;
begin
  select jobid
  into job_id
  from cron.job
  where jobname = 'weekly-ppm-report-monday-8am'
  limit 1;

  if job_id is not null then
    perform cron.unschedule(job_id);
  end if;
end
$$;

select cron.schedule(
  'weekly-ppm-report-monday-8am',
  '0 5 * * 1',
  $cron$
    select net.http_post(
      url := 'https://vmfyfqxfakqsooprptsj.supabase.co/functions/v1/weekly-ppm-report',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-ppm-cron-secret',
        (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'ppm_cron_secret'
          order by created_at desc
          limit 1
        )
      ),
      body := '{"scheduled":true}'::jsonb,
      timeout_milliseconds := 30000
    );
  $cron$
);
