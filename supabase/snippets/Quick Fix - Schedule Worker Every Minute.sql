-- Quick Fix: Schedule Analytics Worker to Run Every Minute
-- Run this entire script in Supabase SQL Editor to fix the cron schedule

-- Step 1: Check if job exists
SELECT 
  jobid,
  jobname,
  schedule,
  active,
  CASE 
    WHEN schedule = '* * * * *' THEN '✓ Already set to every minute'
    WHEN schedule = '*/30 * * * * *' THEN '✗ Set to 30 seconds (may not work)'
    ELSE '✗ Unexpected schedule'
  END as status
FROM cron.job 
WHERE jobname = 'analytics-worker';

-- If you see the job listed above, continue to Step 2
-- If no job found, skip to Step 3

-- Step 2: Safely unschedule existing job
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'analytics-worker') THEN
    PERFORM cron.unschedule('analytics-worker');
    RAISE NOTICE '✓ Unscheduled existing job';
  ELSE
    RAISE NOTICE 'ℹ No existing job to unschedule';
  END IF;
END $$;

-- Step 3: Create new job with every-minute schedule
SELECT cron.schedule(
  'analytics-worker',
  '* * * * *',
  'SELECT public.invoke_analytics_worker()'
);

-- Step 4: Verify the job was created with correct schedule
SELECT 
  jobid,
  jobname,
  schedule,
  command,
  active,
  nodename,
  nodeport
FROM cron.job 
WHERE jobname = 'analytics-worker';

-- Expected output:
-- schedule: '* * * * *'
-- active: true

-- Step 5: Wait 2-3 minutes, then check if it's running
-- (Don't run this immediately - wait at least 2 minutes first)

-- SELECT 
--   runid,
--   status,
--   return_message,
--   start_time,
--   end_time - start_time as duration
-- FROM cron.job_run_details 
-- WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'analytics-worker')
-- ORDER BY start_time DESC 
-- LIMIT 5;

-- Expected: Should see runs approximately 60 seconds apart
-- Status should be 'succeeded' with return_message showing '1 row'

-- ===== TROUBLESHOOTING =====

-- If Step 2 gives error "could not find valid entry":
-- Run this to delete directly from the table:
-- DELETE FROM cron.job WHERE jobname = 'analytics-worker';
-- Then run Step 3 again

-- If job is created but not running:
-- Check pg_cron extension is enabled:
-- SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- If no results, enable it:
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
