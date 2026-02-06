# How to Check Analytics Worker Logs

The analytics worker runs as an Edge Function, so you need to check the Edge Function logs to see what it's processing.

## Step 1: Access Edge Function Logs

1. Go to **Supabase Dashboard**
2. Navigate to **Edge Functions** (left sidebar)
3. Click on **analytics-worker**
4. Click the **Logs** tab

## Step 2: What to Look For

### Normal/Successful Output

When the worker processes events successfully, you'll see logs like:

```json
{
  "success": true,
  "events": {
    "processed": 2,
    "failed": 0
  },
  "heartbeats": {
    "processed": 1,
    "failed": 0,
    "expired": 0
  }
}
```

**Interpretation**:
- `events.processed > 0`: Events were successfully inserted into `internal.events`
- `heartbeats.processed > 0`: Session time was updated in `internal.sessions`
- `failed = 0`: No errors occurred

### No Events to Process

If there are no events in Redis Stream, you'll see:

```json
{
  "success": true,
  "events": {
    "processed": 0,
    "failed": 0
  },
  "heartbeats": {
    "processed": 0,
    "failed": 0,
    "expired": 0
  }
}
```

**This is normal if**:
- No one has visited campaign pages recently
- Redis Stream was emptied
- After a fresh deployment

**To generate events**: Visit a campaign page in your browser

### Worker Logs (Console Output)

You may also see console logs like:

```
[Worker] Starting worker invocation
[Worker] Consumer groups initialized
[Worker] Processing events and heartbeats...
[Worker] No events to process
[Worker] No heartbeats to process
[Worker] Processing complete: ...
```

**Key logs to look for**:
- `Found X new messages` - Events/heartbeats were read from Redis
- `Event processed: {event_id}` - Event successfully inserted
- `Duplicate event skipped` - Event already exists (normal)
- `Orphaned event skipped (session not found)` - Event references deleted session (normal after DB reset)
- `Heartbeat processed for session X: +Ys` - Session time updated

### Error Indicators

**Foreign Key Violations** (should be handled now):
```
[Worker] Orphaned event skipped (session not found): {event_id} for session {session_id}
```
- **Cause**: Event references a session that doesn't exist (common after DB reset)
- **Action**: None needed - worker skips these automatically

**Redis Connection Issues**:
```
Error: Redis command failed (500): ...
```
- **Cause**: Cannot connect to Upstash Redis
- **Action**: Check Redis credentials in environment variables

**Supabase Connection Issues**:
```
Error: Failed to create session / insert event
```
- **Cause**: Database permissions or connection issue
- **Action**: Check service role key has proper permissions

## Step 3: Verify Events Are Being Inserted

After seeing `processed > 0` in the logs:

```sql
-- Check if events were inserted
SELECT COUNT(*) as events_in_last_5_min
FROM internal.events
WHERE created_at > NOW() - INTERVAL '5 minutes';

-- Check if sessions were updated
SELECT 
  session_id,
  active_time_spent,
  session_flag,
  updated_at
FROM internal.sessions
WHERE updated_at > NOW() - INTERVAL '5 minutes'
ORDER BY updated_at DESC
LIMIT 5;
```

## Step 4: Common Scenarios

### Scenario 1: Worker runs but processed=0 for everything

**Diagnosis**: No events in Redis Stream

**Solution**:
1. Visit a campaign page in your browser
2. Check browser console for errors (should see analytics calls)
3. Wait 1 minute for cron to run
4. Check logs again - should see processed > 0

### Scenario 2: processed > 0 but no events in database

**Diagnosis**: Events might be duplicates or orphaned

**Check**:
```sql
-- See if there are any sessions at all
SELECT COUNT(*) FROM internal.sessions;

-- If 0, create a session by visiting campaign page
```

### Scenario 3: Worker not being invoked at all

**Diagnosis**: Cron job not running or invoke function failing

**Check**:
```sql
-- Check cron runs
SELECT status, return_message, start_time
FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'analytics-worker')
ORDER BY start_time DESC 
LIMIT 5;
```

**If no recent runs**: Cron not scheduled properly - see `Quick Fix - Schedule Worker Every Minute.sql`

**If runs show errors**: Check return_message for error details

### Scenario 4: Events processed but expired sessions

You may see:
```
Session expired and ended (XXXs old, +Ys): {session_id}
```

**This is normal**: Sessions older than 30 minutes are automatically ended by the worker

## Step 5: Testing the Complete Flow

1. **Open a campaign page in browser** (as a guest/incognito)
2. **Wait 10 seconds** (to accumulate time)
3. **Click a button** (to generate button_click event)
4. **Wait 1-2 minutes** for cron to run
5. **Check Edge Function logs** - should see:
   - `events.processed: 2` (link_open + button_click)
   - `heartbeats.processed: 1` (time update)
6. **Verify in database**:
   ```sql
   -- Check the session
   SELECT * FROM internal.sessions 
   ORDER BY created_at DESC LIMIT 1;
   
   -- Check the events
   SELECT * FROM internal.events 
   ORDER BY created_at DESC LIMIT 5;
   ```

## Quick Reference: Log Locations

| What to Check | Where to Look |
|---------------|---------------|
| Worker invocation frequency | Supabase Dashboard → Edge Functions → analytics-worker → Invocations |
| Worker output/response | Supabase Dashboard → Edge Functions → analytics-worker → Logs |
| Worker console logs | Supabase Dashboard → Edge Functions → analytics-worker → Logs (scroll down) |
| Cron job status | SQL: `SELECT * FROM cron.job WHERE jobname = 'analytics-worker'` |
| Cron run history | SQL: `SELECT * FROM cron.job_run_details ORDER BY start_time DESC` |
| Redis Stream content | Upstash Console → Redis CLI → `XLEN analytics:events` |
| Postgres logs | Supabase Dashboard → Logs → Postgres Logs |

## Troubleshooting Commands

```sql
-- Manual worker invocation (for testing)
SELECT public.invoke_analytics_worker();

-- Check worker function settings
SELECT 
  current_setting('app.settings.supabase_url', true) as url,
  CASE 
    WHEN current_setting('app.settings.service_role_key', true) IS NOT NULL 
    THEN '***SET***' 
    ELSE 'NOT SET' 
  END as key_status;

-- Count pending events in database
SELECT 
  'Sessions' as table_name,
  COUNT(*) as count,
  MAX(created_at) as latest
FROM internal.sessions
UNION ALL
SELECT 
  'Events',
  COUNT(*),
  MAX(created_at)
FROM internal.events;
```
