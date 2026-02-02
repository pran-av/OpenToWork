# Setup Instructions for Analytics Worker Cron Job

This migration sets up automatic invocation of the analytics-worker Edge Function using pg_cron.

## Prerequisites

1. **Extensions Enabled**: The migration enables `pg_cron` and `pg_net` extensions
2. **Custom Settings Required**: You need to configure two custom settings in Supabase

## Required Configuration

### Step 1: Set Custom Database Settings

In Supabase Dashboard → Settings → Database → Custom Settings, add:

1. **`app.settings.supabase_url`**
   - Value: Your Supabase project URL
   - Example: `https://your-project-ref.supabase.co`
   - **How to find**: Dashboard → Settings → API → Project URL

2. **`app.settings.service_role_key`**
   - Value: Your Supabase service role key
   - Example: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - **How to find**: Dashboard → Settings → API → Service Role Key
   - **⚠️ Security**: This key has full database access. Keep it secure.

### Step 2: Apply the Migration

```bash
# Using Supabase CLI
supabase db push

# Or apply manually via Supabase Dashboard SQL Editor
```

### Step 3: Verify the Cron Job

Check if the job is scheduled:

```sql
-- View all cron jobs
SELECT * FROM cron.job WHERE jobname = 'analytics-worker';

-- View job execution history
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'analytics-worker')
ORDER BY start_time DESC 
LIMIT 10;
```

## Managing the Cron Job

### View Job Status

```sql
-- Check if job is scheduled
SELECT * FROM cron.job WHERE jobname = 'analytics-worker';

-- View recent executions
SELECT 
  jobid,
  runid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'analytics-worker')
ORDER BY start_time DESC
LIMIT 20;
```

### Unschedule the Job

```sql
-- Remove the scheduled job
SELECT cron.unschedule('analytics-worker');
```

### Reschedule with Different Interval

```sql
-- First unschedule
SELECT cron.unschedule('analytics-worker');

-- Then reschedule (e.g., every 60 seconds)
SELECT cron.schedule(
  'analytics-worker',
  '*/60 * * * * *',  -- Every 60 seconds
  $$SELECT public.invoke_analytics_worker()$$
);
```

### Update Schedule

```sql
-- Update to run every 15 seconds
SELECT cron.unschedule('analytics-worker');
SELECT cron.schedule(
  'analytics-worker',
  '*/15 * * * * *',
  $$SELECT public.invoke_analytics_worker()$$
);
```

## Cron Schedule Format

The cron format used is: `second minute hour day month weekday`

Examples:
- `*/30 * * * * *` - Every 30 seconds
- `*/60 * * * * *` - Every 60 seconds (every minute)
- `0 */5 * * * *` - Every 5 minutes
- `0 0 * * * *` - Every hour

## Troubleshooting

### Job Not Running

1. **Check if extensions are enabled**:
   ```sql
   SELECT * FROM pg_extension WHERE extname IN ('pg_cron', 'pg_net');
   ```

2. **Check custom settings**:
   ```sql
   SELECT name, setting FROM pg_settings 
   WHERE name LIKE 'app.settings.%';
   ```

3. **Check cron job status**:
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'analytics-worker';
   ```

4. **Check execution logs**:
   ```sql
   SELECT * FROM cron.job_run_details 
   WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'analytics-worker')
   ORDER BY start_time DESC LIMIT 5;
   ```

### Common Issues

1. **"Service role key not configured"**
   - Solution: Set `app.settings.service_role_key` in Database → Custom Settings

2. **"Failed to invoke analytics worker: status=401"**
   - Solution: Verify service role key is correct and has proper permissions

3. **"Failed to invoke analytics worker: status=404"**
   - Solution: Verify `app.settings.supabase_url` is correct and Edge Function is deployed

4. **Job not executing**
   - Solution: Check if pg_cron extension is enabled and cron daemon is running

## Alternative: Manual Testing

You can test the function manually:

```sql
-- Test the invocation function
SELECT public.invoke_analytics_worker();
```

This should return without error and make an HTTP request to your Edge Function.

## Security Notes

- The `invoke_analytics_worker()` function uses `SECURITY DEFINER` to run with elevated privileges
- Only the `postgres` role can execute this function (required for cron)
- The service role key has full database access - keep it secure
- Consider using Supabase Vault for storing sensitive keys in the future

