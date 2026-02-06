-- Fix invoke_analytics_worker function - Remove request_id column reference
-- Issue: net.http_post() doesn't return a column named 'request_id' - it returns a scalar bigint
-- Solution: Use PERFORM instead of SELECT INTO to discard the return value (fire-and-forget async request)

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
  BEGIN
    v_supabase_url := current_setting('app.settings.supabase_url', true);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Supabase URL not configured. Set app.settings.supabase_url via Supabase Dashboard.';
    RETURN;
  END;

  -- Get service role key from custom setting
  BEGIN
    v_service_role_key := current_setting('app.settings.service_role_key', true);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Service role key not configured. Set app.settings.service_role_key via Supabase Dashboard.';
    RETURN;
  END;

  -- Construct Edge Function URL
  v_function_url := v_supabase_url || '/functions/v1/analytics-worker';

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
END;
$$;

-- Grant execute permission to postgres role (required for cron)
GRANT EXECUTE ON FUNCTION public.invoke_analytics_worker() TO postgres, service_role;

-- Revoke from public and anon (security)
REVOKE EXECUTE ON FUNCTION public.invoke_analytics_worker() FROM public, anon, authenticated;
