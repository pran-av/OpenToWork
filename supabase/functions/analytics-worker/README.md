# Analytics Worker Edge Function

This Edge Function processes analytics events and heartbeats from Redis Streams and writes them to the database.

## How It Works

The worker uses **Redis Streams with Consumer Groups** to process events:

1. **Events are queued**: Client sends events/heartbeats → API routes → Redis Streams
2. **Worker polls**: Worker reads from Redis Streams using consumer groups
3. **Processing**: Worker inserts events, updates sessions, and manages session flags
4. **Acknowledgment**: Processed messages are acknowledged and removed from the stream

## Invocation Methods

### Current State: Manual Invocation

The worker currently processes events when it receives an HTTP request. You can invoke it manually:

```bash
# Using Supabase CLI (local)
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/analytics-worker' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{}'

# Using Supabase Dashboard (production)
# Go to Edge Functions → analytics-worker → Invoke
```

### Recommended: Scheduled Invocation

For automatic processing, set up **scheduled invocation** using one of these methods:

#### Option 1: Supabase pg_cron (Recommended)

Create a database function that invokes the Edge Function via HTTP:

```sql
-- Create a function to invoke the worker
CREATE OR REPLACE FUNCTION public.invoke_analytics_worker()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  response text;
BEGIN
  -- Invoke the Edge Function via HTTP
  SELECT content INTO response
  FROM http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/analytics-worker',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  
  RAISE NOTICE 'Worker invoked: %', response;
END;
$$;

-- Schedule to run every 30 seconds
SELECT cron.schedule(
  'analytics-worker',
  '*/30 * * * * *', -- Every 30 seconds
  $$SELECT public.invoke_analytics_worker()$$
);
```

**Note**: Requires `pg_net` extension and proper configuration.

#### Option 2: External Cron Service

Use an external service (e.g., Vercel Cron, GitHub Actions, or a dedicated cron service) to invoke the function:

```bash
# Example: Vercel Cron Job (vercel.json)
{
  "crons": [{
    "path": "/api/cron/analytics-worker",
    "schedule": "*/30 * * * * *"
  }]
}

# Then create: app/api/cron/analytics-worker/route.ts
# That calls the Supabase Edge Function
```

#### Option 3: Supabase Database Webhooks (Future)

Supabase may support scheduled Edge Function invocation in the future. Check the Supabase dashboard for scheduled functions.

## Configuration

### Environment Variables

Set these in Supabase Dashboard → Edge Functions → analytics-worker → Settings:

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (for internal schema access)
- `UPSTASH_REDIS_REST_URL` - Upstash Redis REST URL
- `UPSTASH_REDIS_REST_TOKEN` - Upstash Redis REST token

### Consumer Groups

The worker uses Redis consumer groups:
- **Group Name**: `analytics-worker`
- **Consumer Name**: `worker-{timestamp}` (unique per invocation)

Consumer groups ensure:
- Messages are distributed across multiple workers (if needed)
- Messages are not lost if a worker fails
- Messages can be reprocessed if needed

## Processing Details

### Batch Processing

- Processes up to **10 messages** per stream per invocation
- Events and heartbeats are processed in parallel
- Messages are acknowledged after successful processing

### Deduplication

- Events are deduplicated using `UNIQUE (session_id, event_id)` constraint
- Duplicate events are skipped but acknowledged

### Session Flags

The worker automatically updates session flags:
- `new_session` → `actual_session` (when time spent > 10 seconds)
- `actual_session` → `engaged_session` (when actual + has events)

### Session Expiration

Sessions expire after **30 minutes** of inactivity. Expired sessions are marked with `ended_at`.

## Monitoring

The worker returns processing statistics:

```json
{
  "success": true,
  "events": {
    "processed": 5,
    "failed": 0
  },
  "heartbeats": {
    "processed": 3,
    "failed": 0
  }
}
```

Monitor these metrics to ensure the worker is processing events correctly.

## Troubleshooting

### Events Not Processing

1. **Check if worker is being invoked**: Check Supabase Edge Function logs
2. **Check Redis Streams**: Verify messages are being added to streams
3. **Check consumer groups**: Ensure consumer groups are created
4. **Check database**: Verify RPC functions are accessible

### High Latency

- Reduce batch size if processing is slow
- Increase invocation frequency
- Check Redis and database performance

### Failed Messages

- Check Edge Function logs for error details
- Verify environment variables are set correctly
- Check database constraints and RPC function permissions

