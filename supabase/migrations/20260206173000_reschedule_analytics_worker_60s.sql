-- Reschedule Analytics Worker to run every 60 seconds (every minute)
-- Using standard cron format for maximum compatibility across pg_cron versions

-- Step 1: Safely unschedule existing job if it exists
DO $$
BEGIN
  -- Check if job exists first
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'analytics-worker') THEN
    PERFORM cron.unschedule('analytics-worker');
    RAISE NOTICE 'Unscheduled existing analytics-worker job';
  ELSE
    RAISE NOTICE 'No existing analytics-worker job found, will create new one';
  END IF;
END $$;

-- Step 2: Schedule the job to run every minute (60 seconds)
-- Using standard cron format: '* * * * *' (minute hour day month weekday)
-- This is more compatible than '*/30 * * * * *' which requires second-level support
DO $$
BEGIN
  PERFORM cron.schedule(
    'analytics-worker',                          -- Job name
    '* * * * *',                                -- Every minute (standard cron format)
    'SELECT public.invoke_analytics_worker()'   -- SQL command to execute
  );
  RAISE NOTICE 'Scheduled analytics-worker cron job (every 60 seconds)';
END $$;

-- Step 3: Verify the job was scheduled
DO $$
DECLARE
  v_job_count int;
BEGIN
  SELECT COUNT(*) INTO v_job_count
  FROM cron.job
  WHERE jobname = 'analytics-worker';
  
  IF v_job_count > 0 THEN
    RAISE NOTICE 'Analytics worker cron job successfully scheduled';
  ELSE
    RAISE WARNING 'Failed to schedule analytics worker cron job';
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON FUNCTION public.invoke_analytics_worker() IS 'Invokes the analytics-worker Edge Function via HTTP POST every 60 seconds via pg_cron. Processes events and heartbeats from Redis Streams.';
