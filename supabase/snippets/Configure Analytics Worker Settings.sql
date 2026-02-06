-- Configure Analytics Worker Custom Settings
-- These settings are required for the cron job to invoke the analytics-worker Edge Function
-- Run these commands in Supabase SQL Editor or Dashboard

-- Step 1: Set Supabase URL
-- Replace YOUR_PROJECT_REF with your actual project reference
-- Example: https://abcdefghijklmn.supabase.co
ALTER DATABASE postgres SET app.settings.supabase_url TO 'http://host.docker.internal:54321';

-- Step 2: Set Service Role Key
-- Replace YOUR_SERVICE_ROLE_KEY with your actual service role key
-- Find it in: Supabase Dashboard → Settings → API → service_role (secret)
ALTER DATABASE postgres SET app.settings.service_role_key TO 'SERVICE_ROLE_KEY';

-- Step 3: Verify settings are configured
SELECT 
  current_setting('app.settings.supabase_url', true) as supabase_url,
  CASE 
    WHEN current_setting('app.settings.service_role_key', true) IS NOT NULL 
    THEN '***CONFIGURED***' 
    ELSE 'NOT SET' 
  END as service_role_key_status;

-- Step 4: Test the function manually
SELECT public.invoke_analytics_worker();

-- Step 5: Check cron job logs (after 30 seconds)
SELECT 
  jobid,
  runid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'analytics-worker')
ORDER BY start_time DESC 
LIMIT 5;

-- Step 6: Check Postgres logs for warnings (if function fails silently)
-- Look for warnings starting with "[Analytics Worker]" in Supabase Dashboard → Logs → Postgres Logs

-- ===== TROUBLESHOOTING =====

-- If you get "null value in column url violates not-null constraint":
-- → The supabase_url setting is not configured properly
-- → Run Step 1 above with your actual project URL

-- If you get "column request_id does not exist":
-- → Apply migration 20260206170200_fix_invoke_analytics_worker_request_id.sql

-- If cron job doesn't run:
-- → Check if cron job exists: SELECT * FROM cron.job WHERE jobname = 'analytics-worker';
-- → If missing, run migration 20260203004014_schedule_analytics_worker.sql

-- To update settings after changing them:
-- You must reconnect to the database or run: SELECT pg_reload_conf();
