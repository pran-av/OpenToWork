-- Fix Analytics Worker Cron Job Schedule
-- If the cron job is not running every 30 seconds, use these queries to diagnose and fix

-- Step 1: Check current cron job schedule
SELECT 
  jobid,
  jobname,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active
FROM cron.job 
WHERE jobname = 'analytics-worker';

-- Expected output:
-- schedule: '*/30 * * * * *' (every 30 seconds)
-- If schedule is different (e.g., '* * * * *' which is every minute), follow Step 2

-- Step 2: Check recent run history to see actual frequency
SELECT 
  runid,
  status,
  return_message,
  start_time,
  end_time,
  start_time - LAG(start_time) OVER (ORDER BY start_time) as time_since_last_run
FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'analytics-worker')
ORDER BY start_time DESC 
LIMIT 10;

-- Look at the 'time_since_last_run' column:
-- - Should be ~30 seconds if working correctly
-- - If it's ~60 seconds, the schedule is set to every minute instead

-- Step 3: If schedule is wrong, unschedule and reschedule
-- IMPORTANT: This will delete the old job and create a new one

-- Safe approach: Check if job exists first, then unschedule
DO $$
BEGIN
  -- Try to unschedule if it exists
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'analytics-worker') THEN
    PERFORM cron.unschedule('analytics-worker');
    RAISE NOTICE 'Unscheduled existing analytics-worker job';
  ELSE
    RAISE NOTICE 'No existing analytics-worker job found';
  END IF;
END $$;

-- Now schedule with 60-second interval (every minute)
-- Using standard cron format for better compatibility
SELECT cron.schedule(
  'analytics-worker',                          -- Job name
  '* * * * *',                                -- Every minute (60 seconds)
  'SELECT public.invoke_analytics_worker()'   -- Command
);

-- Step 4: Verify the new schedule
SELECT 
  jobid,
  jobname,
  schedule,
  command,
  active
FROM cron.job 
WHERE jobname = 'analytics-worker';

-- Expected: schedule = '*/30 * * * * *'

-- Step 5: Wait 2-3 minutes and check if it's running every minute
-- Run this after waiting ~2-3 minutes:
SELECT 
  COUNT(*) as runs_in_last_3_minutes,
  MIN(start_time) as first_run,
  MAX(start_time) as last_run,
  MAX(start_time) - MIN(start_time) as time_span
FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'analytics-worker')
  AND start_time > NOW() - INTERVAL '3 minutes';

-- Expected: runs_in_last_3_minutes should be ~3 (one per minute)

-- Step 6: Alternative - If you need to completely recreate the job
-- Use this if you encounter errors about job not found or other issues

-- Delete from cron.job directly (use with caution)
DELETE FROM cron.job WHERE jobname = 'analytics-worker';

-- Then create fresh
SELECT cron.schedule(
  'analytics-worker',
  '* * * * *',  -- Every minute
  'SELECT public.invoke_analytics_worker()'
);

-- Verify it was created
SELECT jobid, jobname, schedule, active
FROM cron.job 
WHERE jobname = 'analytics-worker';

-- ===== TROUBLESHOOTING =====

-- If job shows as 'inactive' (active = false):
-- Possible cause: pg_cron daemon not running or job was manually disabled
-- Solution: Drop and recreate the job
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'analytics-worker') THEN
    PERFORM cron.unschedule('analytics-worker');
  END IF;
END $$;

SELECT cron.schedule('analytics-worker', '* * * * *', 'SELECT public.invoke_analytics_worker()');

-- If job runs but fails:
-- Check the return_message column in job_run_details
SELECT 
  status,
  return_message,
  start_time
FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'analytics-worker')
ORDER BY start_time DESC 
LIMIT 5;

-- If return_message contains errors about settings:
-- Follow the Configure Analytics Worker Settings.sql guide

-- To view all cron jobs (useful for debugging):
SELECT * FROM cron.job ORDER BY jobid;
