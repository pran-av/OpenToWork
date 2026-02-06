# Analytics Worker Cron Setup Guide

## Problem Summary

The cron job is failing with error:
```
null value in column "url" of relation "http_request_queue" violates not-null constraint
```

**Root Cause**: The custom settings `app.settings.supabase_url` and `app.settings.service_role_key` are not configured in the database, causing NULL values to be passed to `net.http_post()`.

## Solution Steps

### Step 1: Apply Latest Migration

Apply the migration that adds explicit NULL checks:

```bash
# From your project root
supabase db push
```

Or run the migration directly in Supabase SQL Editor:
- File: `supabase/migrations/20260206170300_fix_invoke_analytics_worker_null_check.sql`

### Step 2: Configure Custom Settings in Production

**Option A: Via Supabase Dashboard (Recommended)**

1. Go to: **Supabase Dashboard → Project Settings → Database → Custom Settings**
2. Click **"New custom setting"**
3. Add the following settings:

   - **Name**: `app.settings.supabase_url`
   - **Value**: `https://YOUR_PROJECT_REF.supabase.co` (your actual Supabase URL)

   - **Name**: `app.settings.service_role_key`
   - **Value**: Your service role key (found in Settings → API → service_role)

**Option B: Via SQL (Alternative)**

Run in Supabase SQL Editor:

```sql
-- Set Supabase URL (replace with your actual URL)
ALTER DATABASE postgres SET app.settings.supabase_url TO 'https://abcdefghijklmn.supabase.co';

-- Set Service Role Key (replace with your actual key)
ALTER DATABASE postgres SET app.settings.service_role_key TO 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

### Step 3: Verify Settings Are Configured

Run this query to check:

```sql
SELECT 
  current_setting('app.settings.supabase_url', true) as supabase_url,
  CASE 
    WHEN current_setting('app.settings.service_role_key', true) IS NOT NULL 
    THEN '***CONFIGURED***' 
    ELSE 'NOT SET' 
  END as service_role_key_status;
```

Expected output:
- `supabase_url`: Should show your Supabase URL
- `service_role_key_status`: Should show `***CONFIGURED***`

### Step 4: Test the Function Manually

```sql
SELECT public.invoke_analytics_worker();
```

If settings are configured correctly, this should complete without errors.

### Step 5: Wait for Next Cron Run (30 seconds)

The cron job runs every 30 seconds. After waiting ~30 seconds, check the logs:

```sql
SELECT 
  jobid,
  runid,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'analytics-worker')
ORDER BY start_time DESC 
LIMIT 5;
```

Look for:
- `status`: Should be `succeeded`
- `return_message`: Should be empty or NULL (no errors)

### Step 6: Check Postgres Logs (If Issues Persist)

Go to: **Supabase Dashboard → Logs → Postgres Logs**

Look for warnings starting with `[Analytics Worker]`:
- If you see "Supabase URL not configured" → Settings not set correctly
- If you see "Service role key not configured" → Settings not set correctly
- If you see "Unexpected error" → Check the error details

## Why Local Testing Doesn't Work

`pg_net` (which makes HTTP requests) only works on **hosted Supabase**, not local Supabase. The background worker that executes HTTP requests doesn't run locally.

**Bottom line**: You **must** test this on production/staging hosted Supabase.

## Verification Checklist

- [ ] Migration `20260206170300_fix_invoke_analytics_worker_null_check.sql` applied
- [ ] `app.settings.supabase_url` configured in database
- [ ] `app.settings.service_role_key` configured in database
- [ ] Manual test `SELECT public.invoke_analytics_worker();` succeeds
- [ ] Cron job runs successfully (check `cron.job_run_details`)
- [ ] Edge Function receives requests (check Edge Function logs)
- [ ] Worker processes events from Redis (check worker response)

## Common Errors and Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| `null value in column "url"` | Settings not configured | Configure custom settings (Step 2) |
| `column "request_id" does not exist` | Old migration version | Apply migration `20260206170200` |
| `[Analytics Worker] Supabase URL not configured` | Setting is NULL | Run Step 2 to set the URL |
| Cron job doesn't run | pg_cron not enabled | Run migration `20260203004014` |
| Settings not taking effect | Connection pool cached old values | Reconnect or `SELECT pg_reload_conf();` |

## Files Created/Modified

1. **Migration**: `supabase/migrations/20260206170300_fix_invoke_analytics_worker_null_check.sql`
   - Adds explicit NULL checks for settings
   - Provides clear error messages when settings are missing

2. **Snippet**: `supabase/snippets/Configure Analytics Worker Settings.sql`
   - SQL commands to configure custom settings
   - Verification queries
   - Troubleshooting queries

3. **Worker Fix**: `supabase/functions/analytics-worker/index.ts`
   - Already updated to handle foreign key violations (orphaned events)
