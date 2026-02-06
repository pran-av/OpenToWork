-- Quick Check: Is the Analytics Worker Processing Events?
-- Run this single query for a quick status overview

SELECT 
  '=== CRON STATUS ===' as section,
  NULL::text as metric,
  NULL::text as value
UNION ALL
SELECT 
  'Cron Job',
  'Active',
  CASE WHEN j.active THEN '✓ Yes' ELSE '✗ No' END
FROM cron.job j WHERE j.jobname = 'analytics-worker'
UNION ALL
SELECT 
  'Cron Job',
  'Runs (last 5 min)',
  COUNT(*)::text
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'analytics-worker')
  AND start_time > NOW() - INTERVAL '5 minutes'
UNION ALL
SELECT 
  'Cron Job',
  'Last Run Status',
  COALESCE(
    (SELECT status FROM cron.job_run_details 
     WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'analytics-worker')
     ORDER BY start_time DESC LIMIT 1),
    'No runs yet'
  )
UNION ALL
SELECT 
  '=== DATABASE STATE ===' as section,
  NULL::text,
  NULL::text
UNION ALL
SELECT 
  'Database',
  'Total Sessions',
  COUNT(*)::text
FROM internal.sessions
UNION ALL
SELECT 
  'Database',
  'Active Sessions',
  COUNT(*)::text
FROM internal.sessions
WHERE ended_at IS NULL
UNION ALL
SELECT 
  'Database',
  'Total Events',
  COUNT(*)::text
FROM internal.events
UNION ALL
SELECT 
  'Database',
  'Events (last 5 min)',
  COUNT(*)::text
FROM internal.events
WHERE created_at > NOW() - INTERVAL '5 minutes'
UNION ALL
SELECT 
  'Database',
  'Sessions (last 5 min)',
  COUNT(*)::text
FROM internal.sessions
WHERE created_at > NOW() - INTERVAL '5 minutes'
UNION ALL
SELECT 
  '=== DIAGNOSIS ===' as section,
  NULL::text,
  NULL::text
UNION ALL
SELECT 
  'Diagnosis',
  'Status',
  CASE 
    WHEN (SELECT COUNT(*) FROM internal.events WHERE created_at > NOW() - INTERVAL '5 minutes') > 0 
    THEN '✓ Events are being processed'
    WHEN (SELECT COUNT(*) FROM internal.sessions) = 0
    THEN '⚠ No sessions in DB - visit a campaign page to create sessions'
    WHEN (SELECT COUNT(*) FROM cron.job_run_details WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'analytics-worker') AND start_time > NOW() - INTERVAL '5 minutes') = 0
    THEN '✗ Cron job not running - check cron schedule'
    ELSE '⚠ Cron running but no events processed - check Redis Stream or Edge Function logs'
  END
ORDER BY section, metric;

-- Next Steps Based On Diagnosis:
-- 
-- ✓ "Events are being processed"
--   → Everything is working! Events are flowing from Redis to database
--
-- ⚠ "No sessions in DB"
--   → Visit a campaign page in your browser to create a session and events
--   → URL format: https://your-domain.com/project/PROJECT_ID
--
-- ✗ "Cron job not running"
--   → Run: supabase/snippets/Quick Fix - Schedule Worker Every Minute.sql
--
-- ⚠ "Cron running but no events processed"
--   → Check if events are in Redis (go to Upstash Console, run: XLEN analytics:events)
--   → Check Edge Function logs (Supabase Dashboard → Edge Functions → analytics-worker → Logs)
--   → If XLEN returns 0: No events in Redis, visit campaign pages to generate events
--   → If XLEN > 0: Events in Redis but not being processed, check worker logs for errors
