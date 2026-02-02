# Analytics Testing Guide

## Overview

This guide provides comprehensive testing procedures for the analytics tracking system before applying database migrations. Test all components in isolation and integration to ensure the system works correctly.

## Pre-Migration Testing Checklist

### ✅ Phase 1: Database Schema (No Migration Required)
- [ ] Review migration SQL files for syntax errors
- [ ] Verify ENUM types are correct
- [ ] Check foreign key constraints
- [ ] Verify indexes are created
- [ ] Confirm trigger functions are secure

### ✅ Phase 2: Client-Side Tracking
- [ ] Session creation on page load
- [ ] Event batching and flushing
- [ ] Heartbeat pings
- [ ] Cookie management
- [ ] Multiple tab handling

### ✅ Phase 3: API Routes
- [ ] Rate limiting
- [ ] Request validation
- [ ] Redis Stream integration
- [ ] Error handling

### ✅ Phase 5: Edge Function Worker
- [ ] Redis Stream consumption
- [ ] Event processing
- [ ] Heartbeat accumulation
- [ ] Session flag updates

### ✅ Phase 6: Dashboard UI
- [ ] Analytics display
- [ ] Refresh functionality
- [ ] Error states
- [ ] Loading states

---

## Test Scenarios

### 1. Session Creation and Cookie Management

**Test Case 1.1: Initial Session Creation**
```
Steps:
1. Open campaign page in incognito/private browser
2. Check browser DevTools → Application → Cookies
3. Verify session cookie is created with:
   - Name: otw_analytics_session
   - HttpOnly: true
   - Secure: true (in production)
   - SameSite: Lax
   - MaxAge: 1800 (30 minutes)
4. Check Network tab for POST /api/analytics/session request
5. Verify response contains session_id and campaign_id
```

**Test Case 1.2: Session Persistence**
```
Steps:
1. Create a session (open campaign page)
2. Navigate to step 2 (click a service)
3. Refresh the page
4. Verify same session_id is used (check cookie)
5. Verify no new session is created
```

**Test Case 1.3: Session Expiration**
```
Steps:
1. Create a session
2. Wait 30+ minutes (or manually expire cookie)
3. Open campaign page again
4. Verify new session is created
```

**Test Case 1.4: Campaign ID Resolution**
```
Steps:
1. Open campaign page without campaign_id in URL
2. Verify session is created with correct campaign_id
3. Check API response includes resolved campaign_id
```

**Test Case 1.5: User ID Resolution**
```
Steps:
1. Open campaign page as anonymous user
2. Verify session is created with user_id = null
3. Sign in (if applicable)
4. Verify subsequent events include user_id
```

---

### 2. Event Batching and Flushing

**Test Case 2.1: Event Batching**
```
Steps:
1. Open campaign page
2. Click multiple buttons rapidly (10+ clicks)
3. Check Network tab
4. Verify events are batched (not sent individually)
5. Verify batch size is ≤ 60 events
```

**Test Case 2.2: Automatic Flush (30-60 seconds)**
```
Steps:
1. Open campaign page
2. Click a button
3. Wait 30-60 seconds without interaction
4. Check Network tab for POST /api/analytics/events
5. Verify events are sent in batch
```

**Test Case 2.3: Immediate Flush on Visibility Change**
```
Steps:
1. Open campaign page
2. Click a button
3. Switch to another tab (visibilitychange: hidden)
4. Check Network tab immediately
5. Verify events are flushed immediately
```

**Test Case 2.4: Immediate Flush on Page Hide**
```
Steps:
1. Open campaign page
2. Click a button
3. Close the tab or navigate away
4. Check Network tab (use "Preserve log")
5. Verify events are flushed on pagehide
```

**Test Case 2.5: Event Metadata**
```
Steps:
1. Click a service button (step1)
2. Click a case study (step2)
3. Click Connect button (step2)
4. Click CTA button (step3)
5. Check event metadata in Redis Stream or database:
   - page_navigation: step1, step2, step3
   - button_name: correct button text
   - external_link: true/false as appropriate
```

---

### 3. Heartbeat Accumulation

**Test Case 3.1: Regular Heartbeat Pings**
```
Steps:
1. Open campaign page
2. Keep tab active and focused
3. Check Network tab every 30 seconds
4. Verify heartbeat POST /api/analytics/heartbeat every 30s
5. Verify time_increment = 30
```

**Test Case 3.2: Heartbeat Pause on Tab Switch**
```
Steps:
1. Open campaign page
2. Wait for first heartbeat (30s)
3. Switch to another tab
4. Wait 60 seconds
5. Switch back to campaign tab
6. Verify no heartbeats were sent while tab was hidden
7. Verify heartbeat resumes when tab is visible
```

**Test Case 3.3: Heartbeat Flush on Tab Hide**
```
Steps:
1. Open campaign page
2. Wait for at least one heartbeat
3. Switch to another tab
4. Check Network tab for final heartbeat
5. Verify heartbeat is sent on visibilitychange: hidden
```

**Test Case 3.4: Time Accumulation**
```
Steps:
1. Create a session
2. Keep page active for 2 minutes (4 heartbeats)
3. Check database: active_time_spent should be ~120 seconds
4. Verify worker processes heartbeats correctly
```

---

### 4. Session Flag Updates

**Test Case 4.1: New Session → Actual Session**
```
Steps:
1. Create a new session
2. Keep page active for >10 seconds
3. Trigger at least one heartbeat
4. Check database: session_flag should be 'actual_session'
5. Verify worker updates flag correctly
```

**Test Case 4.2: Actual Session → Engaged Session**
```
Steps:
1. Create a session with >10 seconds time
2. Click a button (trigger event)
3. Check database: session_flag should be 'engaged_session'
4. Verify worker updates flag after event processing
```

**Test Case 4.3: Bot Detection (10 Second Filter)**
```
Steps:
1. Create a session
2. Close page immediately (<10 seconds)
3. Check database: session_flag should remain 'new_session'
4. Verify bot-like behavior is filtered
```

---

### 5. Rate Limiting

**Test Case 5.1: Session Creation Rate Limit**
```
Steps:
1. Make 5 POST requests to /api/analytics/session in 1 minute
2. Verify all requests succeed
3. Make 6th request within same minute
4. Verify 429 Too Many Requests response
5. Verify resetAt timestamp in response
```

**Test Case 5.2: Events Rate Limit**
```
Steps:
1. Send 50 POST requests to /api/analytics/events in 10 seconds
2. Verify all requests succeed
3. Send 51st request within same 10-second window
4. Verify 429 Too Many Requests response
```

---

### 6. Deduplication

**Test Case 6.1: Duplicate Event Prevention**
```
Steps:
1. Send same event_id twice to /api/analytics/events
2. Check database: only one event should exist
3. Verify UNIQUE constraint works
4. Verify worker handles duplicates gracefully
```

**Test Case 6.2: Duplicate Session Prevention**
```
Steps:
1. Create session with same session_id twice
2. Check database: only one session should exist
3. Verify idempotency works
```

---

### 7. Analytics Data Accuracy

**Test Case 7.1: Total Actual Sessions**
```
Steps:
1. Create 3 sessions with >10 seconds time each
2. Create 2 sessions with <10 seconds time
3. Check dashboard: Total Actual Sessions = 3
4. Verify calculation is correct
```

**Test Case 7.2: Total Engaged Sessions**
```
Steps:
1. Create 2 actual sessions with events
2. Create 1 actual session without events
3. Check dashboard: Total Engaged Sessions = 2
4. Verify calculation is correct
```

**Test Case 7.3: Total Time Spent**
```
Steps:
1. Create session 1: 120 seconds
2. Create session 2: 90 seconds
3. Create session 3: 45 seconds
4. Check dashboard: Total Time Spent = 255 seconds (4m 15s)
5. Verify calculation is correct
```

---

### 8. Dashboard Refresh

**Test Case 8.1: Manual Refresh**
```
Steps:
1. Open campaign dashboard
2. View analytics data
3. Create new session/events in another browser
4. Click Refresh button
5. Verify analytics data updates
6. Verify loading state shows during refresh
```

**Test Case 8.2: Error Handling**
```
Steps:
1. Open campaign dashboard
2. Temporarily break API endpoint
3. Click Refresh button
4. Verify error message is displayed
5. Verify page still functions (can edit campaign, etc.)
6. Fix API endpoint
7. Click Refresh again
8. Verify data loads successfully
```

---

## Edge Cases

### 9. Multiple Tabs (Same Session)

**Test Case 9.1: Same Session Across Tabs**
```
Steps:
1. Open campaign page in Tab 1
2. Copy URL and open in Tab 2 (same browser)
3. Verify both tabs use same session_id (check cookies)
4. Click button in Tab 1
5. Click button in Tab 2
6. Verify both events are associated with same session
```

### 10. Tab Switching (Pause/Resume Heartbeat)

**Test Case 10.1: Heartbeat Pause/Resume**
```
Steps:
1. Open campaign page
2. Wait for heartbeat (30s)
3. Switch to another tab
4. Wait 60 seconds
5. Switch back
6. Verify heartbeat resumes
7. Verify time_spent doesn't include hidden time
```

### 11. Network Failures (Retry Logic)

**Test Case 11.1: Event Send Retry**
```
Steps:
1. Open campaign page
2. Disconnect network
3. Click button (event queued)
4. Reconnect network
5. Verify event is sent on reconnect
6. Verify retry logic works
```

**Test Case 11.2: Heartbeat Retry**
```
Steps:
1. Open campaign page
2. Disconnect network during heartbeat
3. Reconnect network
4. Verify heartbeat is sent
5. Verify time is not lost
```

### 12. Session Expiration

**Test Case 12.1: Session Expires During Activity**
```
Steps:
1. Create session
2. Wait 30+ minutes
3. Continue interacting
4. Verify new session is created
5. Verify old session is marked ended_at
```

### 13. Campaign Switching Mid-Session

**Test Case 13.1: Active Campaign Changes**
```
Steps:
1. Open campaign page (Campaign A active)
2. Create session for Campaign A
3. Switch active campaign to Campaign B (in dashboard)
4. Refresh campaign page
5. Verify new session is created for Campaign B
```

### 14. Bot Detection (10 Second Filter)

**Test Case 14.1: Quick Bounce**
```
Steps:
1. Open campaign page
2. Close immediately (<10 seconds)
3. Verify session_flag remains 'new_session'
4. Verify session is not counted in "Actual Sessions"
```

---

## Manual Testing Scripts

### Quick Test Script 1: Basic Flow
```bash
# 1. Open campaign page
# 2. Verify session created
# 3. Click service button
# 4. Click case study
# 5. Click Connect
# 6. Click CTA button
# 7. Wait 30 seconds
# 8. Check dashboard analytics
```

### Quick Test Script 2: Time Tracking
```bash
# 1. Open campaign page
# 2. Keep page active for 2 minutes
# 3. Verify 4 heartbeats sent
# 4. Check database: active_time_spent ≈ 120s
# 5. Verify session_flag = 'actual_session'
```

### Quick Test Script 3: Error Recovery
```bash
# 1. Open campaign page
# 2. Break API endpoint temporarily
# 3. Click buttons (events queued)
# 4. Fix API endpoint
# 5. Verify events are sent
# 6. Verify no data loss
```

---

## Database Verification Queries

### Check Sessions
```sql
SELECT 
  session_id,
  user_id,
  campaign_id,
  started_at,
  active_time_spent,
  session_flag,
  created_at
FROM internal.sessions
WHERE campaign_id = 'YOUR_CAMPAIGN_ID'
ORDER BY started_at DESC
LIMIT 10;
```

### Check Events
```sql
SELECT 
  e.event_id,
  e.session_id,
  e.event_type,
  e.metadata,
  e.timestamp,
  s.session_flag
FROM internal.events e
JOIN internal.sessions s ON e.session_id = s.session_id
WHERE s.campaign_id = 'YOUR_CAMPAIGN_ID'
ORDER BY e.timestamp DESC
LIMIT 20;
```

### Check Analytics Aggregation
```sql
SELECT 
  COUNT(DISTINCT CASE 
    WHEN session_flag IN ('actual_session', 'engaged_session') 
    THEN session_id 
  END) as total_actual_sessions,
  COUNT(DISTINCT CASE 
    WHEN session_flag = 'engaged_session' 
    THEN session_id 
  END) as total_engaged_sessions,
  COALESCE(SUM(active_time_spent), 0) as total_time_spent
FROM internal.sessions
WHERE campaign_id = 'YOUR_CAMPAIGN_ID';
```

---

## Redis Stream Verification

### Check Events Stream
```bash
# Using Redis CLI or Upstash Console
XINFO STREAM analytics:events
XRANGE analytics:events - + COUNT 10
```

### Check Heartbeats Stream
```bash
# Using Redis CLI or Upstash Console
XINFO STREAM analytics:heartbeats
XRANGE analytics:heartbeats - + COUNT 10
```

### Check Consumer Groups
```bash
# Using Redis CLI or Upstash Console
XINFO GROUPS analytics:events
XINFO GROUPS analytics:heartbeats
```

---

## API Testing with cURL

### Test Session Creation
```bash
curl -X POST http://localhost:3000/api/analytics/session \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "YOUR_PROJECT_ID",
    "user_agent_hash": "test_hash"
  }'
```

### Test Events Batch
```bash
curl -X POST http://localhost:3000/api/analytics/events \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "YOUR_SESSION_ID",
    "events": [
      {
        "event_id": "test-event-1",
        "event_type": "button_click",
        "metadata": {
          "page_navigation": "step1",
          "button_name": "Test Button"
        },
        "timestamp": "2026-02-03T00:00:00Z"
      }
    ]
  }'
```

### Test Heartbeat
```bash
curl -X POST http://localhost:3000/api/analytics/heartbeat \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "YOUR_SESSION_ID",
    "time_increment": 30
  }'
```

### Test Analytics Fetch
```bash
curl -X GET http://localhost:3000/api/analytics/YOUR_CAMPAIGN_ID \
  -H "Cookie: YOUR_AUTH_COOKIE"
```

---

## Browser DevTools Testing

### Network Tab Monitoring
1. Open DevTools → Network tab
2. Filter by "analytics"
3. Monitor:
   - `/api/analytics/session` - Should appear once on page load
   - `/api/analytics/events` - Should appear in batches
   - `/api/analytics/heartbeat` - Should appear every 30s

### Application Tab - Cookies
1. Open DevTools → Application → Cookies
2. Verify `otw_analytics_session` cookie:
   - Value: UUID
   - HttpOnly: ✓
   - Secure: ✓ (production)
   - SameSite: Lax
   - Expires: 30 minutes from creation

### Console Logging
Add temporary console.logs to verify:
- Session creation
- Event batching
- Heartbeat sending
- Error handling

---

## Common Issues and Solutions

### Issue: Events Not Appearing in Database
**Check:**
1. Redis Stream has messages: `XINFO STREAM analytics:events`
2. Worker is running: Check Supabase Edge Function logs
3. Consumer group exists: `XINFO GROUPS analytics:events`
4. Worker is processing: Check worker invocation logs

### Issue: Session Flags Not Updating
**Check:**
1. Worker is processing events/heartbeats
2. Time spent > 10 seconds for actual_session
3. Events exist for engaged_session
4. Worker function `updateSessionFlag` is being called

### Issue: Analytics Not Showing in Dashboard
**Check:**
1. Campaign is ACTIVE or PAUSED (not DRAFT)
2. User owns the campaign
3. API endpoint returns data: Check Network tab
4. RPC function `get_campaign_analytics` works: Test in SQL editor

### Issue: Rate Limiting Too Aggressive
**Check:**
1. Rate limit configuration in `rate-limit.ts`
2. Redis is accessible for rate limit checks
3. IP address detection works correctly

---

## Pre-Migration Validation

Before applying migrations, verify:

1. ✅ All test scenarios pass
2. ✅ No console errors in browser
3. ✅ No API errors in Network tab
4. ✅ Redis Streams are working
5. ✅ Edge Function can be invoked (manually)
6. ✅ Database queries work (test in SQL editor)
7. ✅ Analytics display correctly in dashboard
8. ✅ Error states don't break the page

---

## Post-Migration Validation

After applying migrations:

1. ✅ Verify tables exist: `internal.sessions`, `internal.events`
2. ✅ Verify functions exist: `create_analytics_session`, `get_campaign_analytics`, etc.
3. ✅ Verify indexes are created
4. ✅ Verify RLS policies are correct
5. ✅ Test full flow end-to-end
6. ✅ Verify worker can process events
7. ✅ Verify analytics display in dashboard

---

## Next Steps

1. Run through all test scenarios manually
2. Document any issues found
3. Fix issues before applying migrations
4. Re-test after fixes
5. Apply migrations when all tests pass
6. Verify post-migration functionality

