-- Migration: Schedule Analytics Worker with pg_cron
-- This migration sets up automatic invocation of the analytics-worker Edge Function
-- The worker will be invoked every 30 seconds to process events from Redis Streams

-- Step 1: Enable required extensions
-- pg_cron: For scheduling jobs
-- pg_net: For making HTTP requests to Edge Functions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Step 2: Create function to invoke analytics worker Edge Function
-- This function makes an HTTP POST request to the Edge Function endpoint
CREATE OR REPLACE FUNCTION public.invoke_analytics_worker()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_supabase_url text;
  v_service_role_key text;
  v_function_url text;
  v_response_id bigint;
  v_response_status int;
  v_response_content text;
BEGIN
  -- Get Supabase URL from environment variable or custom setting
  -- Try custom setting first, fallback to environment variable
  BEGIN
    v_supabase_url := current_setting('app.settings.supabase_url', true);
  EXCEPTION WHEN OTHERS THEN
    -- If setting doesn't exist, construct from project reference
    -- Note: This assumes the project ref is available in settings
    -- For production, set 'app.settings.supabase_url' via Supabase Dashboard
    v_supabase_url := current_setting('app.settings.supabase_url', false);
  END;

  -- Get service role key from custom setting
  -- This must be set via Supabase Dashboard: Settings → Database → Custom Settings
  BEGIN
    v_service_role_key := current_setting('app.settings.service_role_key', true);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Service role key not configured. Set app.settings.service_role_key via Supabase Dashboard.';
    RETURN;
  END;

  -- Construct Edge Function URL
  v_function_url := v_supabase_url || '/functions/v1/analytics-worker';

  -- Make HTTP POST request to Edge Function
  SELECT id, status_code, content
  INTO v_response_id, v_response_status, v_response_content
  FROM net.http_post(
    url := v_function_url,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_service_role_key,
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );

  -- Log response (optional, for debugging)
  -- RAISE NOTICE 'Worker invoked: status=%, response_id=%', v_response_status, v_response_id;

  -- Check if request was successful
  IF v_response_status IS NULL OR v_response_status >= 400 THEN
    RAISE WARNING 'Failed to invoke analytics worker: status=%, response_id=%', v_response_status, v_response_id;
  END IF;
END;
$$;

-- Step 3: Grant execute permission to postgres role (required for cron)
GRANT EXECUTE ON FUNCTION public.invoke_analytics_worker() TO postgres;

-- Step 4: Schedule the cron job to run every 30 seconds
-- Cron format: second minute hour day month weekday
-- '*/30 * * * * *' means: every 30 seconds
-- 
-- Note: If the job already exists, this will fail. To update, first unschedule:
-- SELECT cron.unschedule('analytics-worker');
DO $$
BEGIN
  -- Check if job already exists
  IF NOT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'analytics-worker'
  ) THEN
    -- Schedule the job
    PERFORM cron.schedule(
      'analytics-worker',                    -- Job name
      '*/30 * * * * *',                     -- Schedule: every 30 seconds
      'SELECT public.invoke_analytics_worker()'  -- SQL to execute
    );
    RAISE NOTICE 'Scheduled analytics-worker cron job (every 30 seconds)';
  ELSE
    RAISE NOTICE 'Cron job analytics-worker already exists. Skipping schedule.';
  END IF;
END $$;

-- Step 5: Add comments for documentation
COMMENT ON FUNCTION public.invoke_analytics_worker() IS 'Invokes the analytics-worker Edge Function via HTTP POST. Used by pg_cron to process events from Redis Streams. Requires app.settings.supabase_url and app.settings.service_role_key to be configured.';

-- Step 6: Revoke public access (security)
REVOKE EXECUTE ON FUNCTION public.invoke_analytics_worker() FROM public;
REVOKE EXECUTE ON FUNCTION public.invoke_analytics_worker() FROM anon;

-- Note: Only postgres role can execute this function (required for cron)

