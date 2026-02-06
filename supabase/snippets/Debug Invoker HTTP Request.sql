-- Debug: Inspect the HTTP request the invoker is making
-- Run each step individually in Supabase SQL Editor

-- ===== STEP 1: See what URL and headers the function is constructing =====

SELECT 
  current_setting('app.settings.supabase_url', true) as configured_supabase_url,
  current_setting('app.settings.supabase_url', true) || '/functions/v1/analytics-worker' as constructed_function_url,
  LENGTH(current_setting('app.settings.service_role_key', true)) as service_key_length,
  LEFT(current_setting('app.settings.service_role_key', true), 20) || '...' as service_key_prefix;

-- Check:
-- - Does constructed_function_url look correct?  (e.g., https://abcdef.supabase.co/functions/v1/analytics-worker)
-- - Is service_key_length reasonable? (~170+ chars for a JWT)
-- - Does service_key_prefix start with 'eyJhbGciOiJIUzI1NiIs...'?

-- ===== STEP 2: Make a test HTTP request and capture the request ID =====

-- This mimics exactly what the invoker function does, but captures the request ID
SELECT net.http_post(
  url := current_setting('app.settings.supabase_url', true) || '/functions/v1/analytics-worker',
  headers := jsonb_build_object(
    'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
    'Content-Type', 'application/json'
  ),
  body := '{}'::jsonb
) as request_id;

-- NOTE DOWN THE request_id FROM THE RESULT ABOVE
-- You'll use it in Step 3

-- ===== STEP 3: Check the HTTP response (wait 5-10 seconds first!) =====

-- Replace REQUEST_ID_HERE with the ID from Step 2
-- pg_net processes requests asynchronously, so wait a few seconds
SELECT
  id, 
  status_code,
  content::text as response_body,
  timed_out,
  error_msg,
  created
FROM net._http_response
ORDER BY created DESC
LIMIT 10;

-- What to look for:
-- status_code = 200: Worker was invoked successfully
-- status_code = 401: Authorization failed (wrong service role key)
-- status_code = 404: Wrong URL (function not found / not deployed)
-- status_code = 500: Worker crashed during execution
-- status_code IS NULL + error_msg: Network error (can't reach the URL)
-- timed_out = true: Request took too long
-- No rows at all: pg_net background worker isn't processing requests

-- ===== STEP 4: Check ALL recent HTTP responses from pg_net =====

SELECT 
  id,
  status_code,
  LEFT(content::text, 200) as response_preview,
  timed_out,
  error_msg,
  created
FROM net._http_response
ORDER BY created DESC
LIMIT 20;

-- This shows ALL HTTP requests pg_net has made recently
-- If this table is empty, pg_net's background worker may not be running

-- ===== STEP 5: Check if pg_net extension is working =====

-- Verify pg_net is installed
SELECT * FROM pg_extension WHERE extname = 'pg_net';

-- Check pg_net's request queue (pending requests)
SELECT 
  id,
  method,
  url,
  LEFT(headers::text, 100) as headers_preview,
  created
FROM net.http_request_queue
ORDER BY created DESC
LIMIT 10;

-- If requests are piling up in http_request_queue but not in _http_response:
-- → pg_net background worker is not running (restart needed)

-- If http_request_queue is empty:
-- → Requests are being picked up (good) or never queued (bad)

-- ===== STEP 6: Compare working manual invoke vs function invoke =====

-- 6a: First get your actual Supabase URL from the dashboard
-- Then try a direct net.http_post with hardcoded values (replace placeholders):

-- SELECT net.http_post(
--   url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/analytics-worker',
--   headers := jsonb_build_object(
--     'Authorization', 'Bearer YOUR_ACTUAL_SERVICE_ROLE_KEY',
--     'Content-Type', 'application/json'
--   ),
--   body := '{}'::jsonb
-- ) as request_id;

-- Wait 5 seconds, then check response:
-- SELECT status_code, content::text, error_msg
-- FROM net._http_response
-- ORDER BY created DESC
-- LIMIT 1;

-- If this works (status_code=200) but the function doesn't:
-- → The settings stored in app.settings are wrong
-- → Compare the URL/key from Step 1 with the hardcoded values

-- ===== STEP 7: Check if there's a trailing slash or whitespace issue =====

SELECT 
  '>' || current_setting('app.settings.supabase_url', true) || '<' as url_with_markers,
  LENGTH(current_setting('app.settings.supabase_url', true)) as url_length,
  current_setting('app.settings.supabase_url', true) LIKE '%/' as has_trailing_slash,
  current_setting('app.settings.supabase_url', true) LIKE '% %' as has_spaces,
  current_setting('app.settings.supabase_url', true) LIKE 'https://%' as starts_with_https;

-- Check:
-- - has_trailing_slash should be false (trailing slash would make URL: https://x.supabase.co//functions/...)
-- - has_spaces should be false
-- - starts_with_https should be true

-- ===== SUMMARY: LIKELY ISSUES =====

-- 1. net._http_response shows status_code=401
--    → Service role key is wrong or truncated
--    → Re-set it: ALTER DATABASE postgres SET app.settings.service_role_key TO 'eyJ...full_key';

-- 2. net._http_response shows status_code=404  
--    → Edge function not deployed or URL is wrong
--    → Check: supabase functions list (or Dashboard → Edge Functions)
--    → Verify URL doesn't have double slashes or typos

-- 3. net._http_response shows error_msg (no status_code)
--    → DNS or network issue
--    → Check if the URL is reachable

-- 4. net._http_response is completely empty
--    → pg_net background worker is not running
--    → This is a Supabase infrastructure issue (contact support)

-- 5. net.http_request_queue has rows but _http_response doesn't
--    → Same as #4 - pg_net worker stuck

-- 6. Everything looks correct but worker response shows processed=0
--    → Worker is being invoked but Redis has no events
--    → Visit campaign pages to generate events, then check again
