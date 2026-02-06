-- Fix invoke_analytics_worker function
-- The issue: net.http_post returns columns with different names than expected
-- Solution: Use the correct column names or simplify to just invoke without capturing all details

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
  v_request_id bigint;
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

  -- Make HTTP POST request to Edge Function
  -- net.http_post returns: request_id (bigint)
  -- We just need to trigger the request, don't need to capture all response details
  SELECT request_id INTO v_request_id
  FROM net.http_post(
    url := v_function_url,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_service_role_key,
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );

  -- Log request ID for debugging (optional)
  -- RAISE NOTICE 'Analytics worker invoked: request_id=%', v_request_id;

  -- Note: The HTTP request is asynchronous, so we don't wait for the response
  -- The worker will process events/heartbeats when it receives the request
END;
$$;

-- Grant execute permission to postgres role (required for cron)
GRANT EXECUTE ON FUNCTION public.invoke_analytics_worker() TO postgres, service_role;

-- Revoke from public and anon (security)
REVOKE EXECUTE ON FUNCTION public.invoke_analytics_worker() FROM public, anon, authenticated;

