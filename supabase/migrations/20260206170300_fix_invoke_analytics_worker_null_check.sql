-- Fix invoke_analytics_worker function - Add explicit NULL checks for settings
-- Issue: current_setting() with missing_ok=true returns NULL instead of raising an error
-- This causes "null value in column url violates not-null constraint" when calling net.http_post()
-- Solution: Explicitly check for NULL values and provide clear error messages

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
BEGIN
  -- Get Supabase URL from custom setting
  -- The 'true' parameter means missing_ok - returns NULL instead of error if setting doesn't exist
  v_supabase_url := current_setting('app.settings.supabase_url', true);
  
  -- Explicitly check if setting is NULL or empty
  IF v_supabase_url IS NULL OR v_supabase_url = '' THEN
    RAISE WARNING '[Analytics Worker] Supabase URL not configured. To fix: 1) Go to Supabase Dashboard → Settings → Database → Custom Settings, 2) Add setting: app.settings.supabase_url = https://YOUR_PROJECT_REF.supabase.co';
    RETURN;
  END IF;

  -- Get service role key from custom setting
  v_service_role_key := current_setting('app.settings.service_role_key', true);
  
  -- Explicitly check if setting is NULL or empty
  IF v_service_role_key IS NULL OR v_service_role_key = '' THEN
    RAISE WARNING '[Analytics Worker] Service role key not configured. To fix: 1) Go to Supabase Dashboard → Settings → Database → Custom Settings, 2) Add setting: app.settings.service_role_key = YOUR_SERVICE_ROLE_KEY';
    RETURN;
  END IF;

  -- Construct Edge Function URL
  v_function_url := v_supabase_url || '/functions/v1/analytics-worker';
  
  -- Final validation before making HTTP request
  IF v_function_url IS NULL OR v_function_url = '' THEN
    RAISE WARNING '[Analytics Worker] Function URL is NULL after construction. Supabase URL: %', v_supabase_url;
    RETURN;
  END IF;

  -- Make HTTP POST request to Edge Function (fire-and-forget)
  -- PERFORM discards the return value, avoiding column name issues across pg_net versions
  PERFORM net.http_post(
    url := v_function_url,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_service_role_key,
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );

  -- Note: The HTTP request is asynchronous, so we don't wait for the response
  -- The worker will process events/heartbeats when it receives the request
EXCEPTION
  WHEN OTHERS THEN
    -- Catch any unexpected errors and log them
    RAISE WARNING '[Analytics Worker] Unexpected error: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
END;
$$;

-- Grant execute permission to postgres role (required for cron)
GRANT EXECUTE ON FUNCTION public.invoke_analytics_worker() TO postgres, service_role;

-- Revoke from public and anon (security)
REVOKE EXECUTE ON FUNCTION public.invoke_analytics_worker() FROM public, anon, authenticated;

-- Add helpful comment
COMMENT ON FUNCTION public.invoke_analytics_worker() IS 'Invokes the analytics-worker Edge Function via HTTP POST. Used by pg_cron. SETUP REQUIRED: Set app.settings.supabase_url and app.settings.service_role_key in Supabase Dashboard → Settings → Database → Custom Settings.';
