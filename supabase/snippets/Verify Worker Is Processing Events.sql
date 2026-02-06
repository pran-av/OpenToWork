-- Comprehensive Diagnostics: Verify Analytics Worker is Processing Events
-- Run these queries in sequence to diagnose why events aren't appearing in the database

-- ===== SECTION 1: VERIFY CRON JOB IS RUNNING =====

-- 1.1: Check cron job status and recent runs
SELECT 
  j.jobid,
  j.jobname,
  j.schedule,
  j.active,
  (SELECT COUNT(*) 
   FROM cron.job_run_details jrd 
   WHERE jrd.jobid = j.jobid 
   AND jrd.start_time > NOW() - INTERVAL '5 minutes') as runs_last_5_min
FROM cron.job j
WHERE j.jobname = 'analytics-worker';

-- Expected: active = true, runs_last_5_min should be ~5 (one per minute)

-- 1.2: Check recent cron job runs with status
SELECT 
  runid,
  status,
  return_message,
  start_time,
  end_time,
  end_time - start_time as duration
FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'analytics-worker')
ORDER BY start_time DESC 
LIMIT 10;

-- Expected: 
-- - status = 'succeeded'
-- - return_message should be NULL or empty (no errors)
-- - If return_message has warnings about settings, check Configure Analytics Worker Settings.sql

-- ===== SECTION 2: CHECK DATABASE STATE =====

-- 2.1: Count sessions in database (events require sessions to exist)
SELECT 
  COUNT(*) as total_sessions,
  COUNT(*) FILTER (WHERE session_flag = 'new_session') as new_sessions,
  COUNT(*) FILTER (WHERE session_flag = 'actual_session') as actual_sessions,
  COUNT(*) FILTER (WHERE session_flag = 'engaged_session') as engaged_sessions,
  COUNT(*) FILTER (WHERE ended_at IS NULL) as active_sessions,
  MAX(created_at) as latest_session_created,
  MAX(updated_at) as latest_session_updated
FROM internal.sessions;

-- If total_sessions = 0: No sessions exist, so no events can be inserted
-- Solution: Create a session by visiting a campaign page in your browser

-- 2.2: Count events in database
SELECT 
  COUNT(*) as total_events,
  COUNT(*) FILTER (WHERE event_type = 'link_open') as link_open_events,
  COUNT(*) FILTER (WHERE event_type = 'button_click') as button_click_events,
  MAX(timestamp) as latest_event_timestamp,
  MAX(created_at) as latest_event_created
FROM internal.events;

-- If total_events = 0 but sessions exist: Events aren't being processed from Redis

-- 2.3: Check if there are recent sessions created in the last 10 minutes
SELECT 
  session_id,
  user_id,
  project_id,
  campaign_id,
  session_flag,
  active_time_spent,
  started_at,
  created_at,
  updated_at
FROM internal.sessions
WHERE created_at > NOW() - INTERVAL '10 minutes'
ORDER BY created_at DESC
LIMIT 5;

-- If no results: No new sessions in last 10 minutes (need to visit campaign pages)

-- 2.4: Check if there are recent events in the last 10 minutes
SELECT 
  event_id,
  session_id,
  event_type,
  metadata,
  timestamp,
  created_at
FROM internal.events
WHERE created_at > NOW() - INTERVAL '10 minutes'
ORDER BY created_at DESC
LIMIT 10;

-- If no results: No events processed in last 10 minutes

-- ===== SECTION 3: CHECK REDIS STREAM (MANUAL VERIFICATION) =====

-- Note: You cannot directly query Redis from PostgreSQL
-- To check if events are queued in Redis Stream:
-- 1. Go to your Upstash Redis Console (https://console.upstash.com)
-- 2. Select your Redis database
-- 3. Run these commands in the CLI:

-- Check events stream length:
-- XLEN analytics:events

-- Check heartbeats stream length:
-- XLEN analytics:heartbeats

-- View pending events:
-- XPENDING analytics:events analytics-worker

-- View recent events (last 10):
-- XREVRANGE analytics:events + - COUNT 10

-- Expected:
-- - If XLEN returns 0: No events in Redis to process (need to generate events by visiting campaign pages)
-- - If XLEN returns > 0: Events are queued but not being processed by worker

-- ===== SECTION 4: MANUALLY INVOKE WORKER AND CHECK RESPONSE =====

-- 4.1: Invoke worker manually and see if it processes anything
-- Note: This doesn't return the worker's response, just confirms the HTTP request was made
SELECT public.invoke_analytics_worker();

-- Expected: No error (should complete successfully)

-- 4.2: Wait 5-10 seconds, then check Supabase Edge Function logs
-- Go to: Supabase Dashboard → Edge Functions → analytics-worker → Logs
-- Look for recent invocations and check the response:
-- Expected output in logs:
-- {
--   "success": true,
--   "events": { "processed": X, "failed": 0 },
--   "heartbeats": { "processed": Y, "failed": 0, "expired": 0 }
-- }

-- If processed = 0 for both: No events/heartbeats in Redis to process

-- 4.3: Check database again after manual invocation
-- Wait 10 seconds after invoking, then rerun query 2.2 to see if event count increased

-- ===== SECTION 5: CHECK FOR COMMON ISSUES =====

-- 5.1: Check if there are orphaned events (events with session_ids that don't exist)
-- These would be skipped by the worker after DB reset
SELECT 
  COUNT(*) as orphaned_event_count
FROM internal.events e
WHERE NOT EXISTS (
  SELECT 1 FROM internal.sessions s WHERE s.session_id = e.session_id
);

-- If > 0: You have orphaned events (shouldn't happen with current worker code)

-- 5.2: Check Postgres logs for worker warnings
-- Go to: Supabase Dashboard → Logs → Postgres Logs
-- Filter for: "[Worker]" or "[Analytics Worker]"
-- Look for warnings about:
-- - "Orphaned event skipped (session not found)" - Normal after DB reset
-- - "Session not found" - Redis has events for deleted sessions
-- - "Failed to" - Actual errors that need investigation

-- ===== SECTION 6: GENERATE TEST DATA =====

-- If you want to test the worker with fresh data:

-- 6.1: Create a test session manually (replace UUIDs with your actual project/campaign IDs)
-- DO $$
-- DECLARE
--   v_session_id UUID := gen_random_uuid();
-- BEGIN
--   INSERT INTO internal.sessions (session_id, project_id, campaign_id, started_at)
--   VALUES (
--     v_session_id,
--     'YOUR_PROJECT_ID'::UUID,
--     'YOUR_CAMPAIGN_ID'::UUID,
--     NOW()
--   );
--   RAISE NOTICE 'Created test session: %', v_session_id;
-- END $$;

-- 6.2: Then visit a campaign page in your browser to generate real events
-- This will create a session and queue events in Redis

-- ===== SUMMARY CHECKLIST =====

-- Run through this checklist:
-- [ ] Cron job is active and running every minute (Section 1.1)
-- [ ] Cron job runs show status='succeeded' (Section 1.2)
-- [ ] Sessions exist in database (Section 2.1 shows total_sessions > 0)
-- [ ] Check if events are in Redis Stream (Section 3 - must check Upstash Console)
-- [ ] Check Edge Function logs show worker is being invoked (Section 4.2)
-- [ ] Check Edge Function logs show events/heartbeats being processed (Section 4.2)
-- [ ] If processed=0, generate events by visiting campaign pages in browser
-- [ ] After generating events, wait 1-2 minutes and rerun Section 2.2 to confirm events appear

-- ===== EXPECTED WORKFLOW =====

-- Normal flow when everything works:
-- 1. User visits campaign page in browser
-- 2. Browser creates session via /api/analytics/session
-- 3. Browser queues events in Redis via /api/analytics/events
-- 4. Browser sends heartbeats via /api/analytics/heartbeat
-- 5. Cron job runs every minute, invokes invoke_analytics_worker()
-- 6. Worker reads events/heartbeats from Redis Streams
-- 7. Worker inserts events into internal.events
-- 8. Worker updates session time in internal.sessions
-- 9. You see event count increase in Section 2.2
