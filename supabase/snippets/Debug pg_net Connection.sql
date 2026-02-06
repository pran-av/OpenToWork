-- Debug pg_net connection failure
-- pg_net returns NULL status_code + error_msg = network-level failure

-- ===== STEP 1: Get the EXACT error message =====

SELECT 
  id,
  status_code,
  error_msg,
  timed_out,
  created
FROM net._http_response
ORDER BY created DESC
LIMIT 10;

-- IMPORTANT: Copy the exact error_msg text - it tells us the specific issue:
-- "Could not resolve host" → DNS issue / wrong hostname
-- "Connection refused" → URL reachable but port closed
-- "SSL certificate problem" → HTTPS/TLS issue
-- "Connection timed out" → Firewall or network restriction
-- "Name or service not known" → Invalid hostname

-- ===== STEP 2: Check the exact URL being used =====

SELECT 
  current_setting('app.settings.supabase_url', true) as raw_url,
  current_setting('app.settings.supabase_url', true) || '/functions/v1/analytics-worker' as full_url;

-- Verify:
-- - Does raw_url match your project URL exactly? (https://PROJECT_REF.supabase.co)
-- - No trailing slash on raw_url
-- - No spaces or newlines

-- ===== STEP 3: Test with a known working external URL =====
-- This tells us if pg_net can make ANY outbound HTTP request

SELECT net.http_post(
  url := 'https://httpbin.org/post',
  headers := '{"Content-Type": "application/json"}'::jsonb,
  body := '{"test": true}'::jsonb
) as test_request_id;

-- Wait 5-10 seconds, then check:
SELECT id, status_code, LEFT(content::text, 200) as response_preview, error_msg
FROM net._http_response
ORDER BY created DESC
LIMIT 1;

-- If this ALSO fails → pg_net can't make any outbound requests (infrastructure issue)
-- If this succeeds (status_code=200) → pg_net works, but can't reach YOUR specific URL

-- ===== STEP 4: Test reaching Supabase URL directly (without auth) =====

SELECT net.http_post(
  url := current_setting('app.settings.supabase_url', true) || '/functions/v1/analytics-worker',
  headers := '{"Content-Type": "application/json"}'::jsonb,
  body := '{}'::jsonb
) as no_auth_request_id;

-- Wait 5-10 seconds, then check:
SELECT id, status_code, LEFT(content::text, 200) as response_preview, error_msg
FROM net._http_response
ORDER BY created DESC
LIMIT 1;

-- If status_code = 401 → URL is reachable! Auth header is the issue
-- If error_msg → Same network error, URL itself is unreachable

-- ===== STEP 5: Try internal Supabase URL format =====
-- On some Supabase setups, Edge Functions are accessible via internal networking
-- The external URL might not be reachable from within the database

-- Try with the Kong API gateway URL (internal to Supabase infrastructure)
-- Format: http://kong:8000/functions/v1/analytics-worker

SELECT net.http_post(
  url := 'http://kong:8000/functions/v1/analytics-worker',
  headers := jsonb_build_object(
    'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
    'Content-Type', 'application/json'
  ),
  body := '{}'::jsonb
) as kong_request_id;

-- Wait 5-10 seconds, then check:
SELECT id, status_code, LEFT(content::text, 200) as response_preview, error_msg
FROM net._http_response
ORDER BY created DESC
LIMIT 1;

-- ===== STEP 6: Try with the Supabase API URL (alternate format) =====
-- Some hosted Supabase instances use a different internal URL

-- Option A: Try https://PROJECT_REF.functions.supabase.co/analytics-worker
-- (Replace PROJECT_REF with your actual project ref)

-- SELECT net.http_post(
--   url := 'https://PROJECT_REF.functions.supabase.co/analytics-worker',
--   headers := jsonb_build_object(
--     'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
--     'Content-Type', 'application/json'
--   ),
--   body := '{}'::jsonb
-- ) as alt_request_id;

-- ===== STEP 7: Check pending requests stuck in queue =====

SELECT 
  id,
  method,
  url,
  timeout_milliseconds,
  created
FROM net.http_request_queue
ORDER BY created DESC
LIMIT 10;

-- If requests are accumulating here but never getting responses:
-- → pg_net background worker is stuck or not running
-- → May need Supabase support to restart pg_net worker

-- ===== STEP 8: Check net schema tables and functions =====

-- List all tables in net schema
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'net';

-- List all functions in net schema  
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'net';

-- Check pg_net worker status (if available)
SELECT * FROM pg_stat_activity WHERE backend_type LIKE '%pg_net%';
