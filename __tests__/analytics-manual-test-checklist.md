# Analytics Manual Testing Checklist

Use this checklist to systematically test the analytics system before applying migrations.

## Pre-Testing Setup

- [ ] Environment variables configured:
  - [ ] `UPSTASH_REDIS_REST_URL`
  - [ ] `UPSTASH_REDIS_REST_TOKEN`
  - [ ] `SUPABASE_URL`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Upstash Redis is accessible
- [ ] Supabase project is running
- [ ] Test campaign created (ACTIVE status)
- [ ] Browser DevTools open (Network, Application, Console tabs)

---

## Section 1: Session Management

### 1.1 Initial Session Creation
- [ ] Open campaign page in incognito browser
- [ ] Check Console: No errors
- [ ] Check Network: POST `/api/analytics/session` returns 200
- [ ] Check Cookies: `otw_analytics_session` exists
- [ ] Verify cookie properties:
  - [ ] HttpOnly: true
  - [ ] Secure: true (production) or false (dev)
  - [ ] SameSite: Lax
  - [ ] MaxAge: 1800 (30 minutes)
- [ ] Verify session_id in response matches cookie value

### 1.2 Session Persistence
- [ ] Refresh page
- [ ] Verify same session_id is used (cookie unchanged)
- [ ] Verify no new session created (check Network tab)
- [ ] Navigate to step 2
- [ ] Verify session_id persists

### 1.3 Campaign ID Resolution
- [ ] Open campaign page (project URL, no campaign_id)
- [ ] Verify session created with correct campaign_id
- [ ] Check API response includes resolved campaign_id
- [ ] Verify campaign_id matches active campaign

### 1.4 User ID Resolution
- [ ] Open as anonymous user
- [ ] Verify session created with user_id = null
- [ ] (If applicable) Sign in
- [ ] Verify subsequent requests include user_id

---

## Section 2: Event Tracking

### 2.1 Link Open Event
- [ ] Open campaign page
- [ ] Check Network: Initial `link_open` event sent
- [ ] Verify event metadata is correct
- [ ] Verify event appears in Redis Stream (if accessible)

### 2.2 Button Click Events - Step 1
- [ ] Click a service button
- [ ] Check Network: Event sent (may be batched)
- [ ] Verify metadata:
  - [ ] `page_navigation`: "step1"
  - [ ] `button_name`: Service name
  - [ ] `external_link`: false

### 2.3 Button Click Events - Step 2
- [ ] Click a case study card
- [ ] Check Network: Event sent
- [ ] Verify metadata:
  - [ ] `page_navigation`: "step2"
  - [ ] `button_name`: Case study name
  - [ ] `external_link`: true (if has URL)
- [ ] Click "CONNECT" button
- [ ] Verify event sent with correct metadata

### 2.4 Button Click Events - Step 3
- [ ] Click a CTA button (schedule, email, linkedin, phone)
- [ ] Check Network: Event sent
- [ ] Verify metadata:
  - [ ] `page_navigation`: "step3"
  - [ ] `button_name`: Button identifier
  - [ ] `external_link`: true
- [ ] Submit form (if applicable)
- [ ] Verify form submit event sent

### 2.5 Event Batching
- [ ] Click 10+ buttons rapidly
- [ ] Check Network: Events batched (not sent individually)
- [ ] Verify batch size ≤ 60 events
- [ ] Wait 30-60 seconds
- [ ] Verify batch is flushed automatically

### 2.6 Immediate Flush
- [ ] Click a button
- [ ] Switch to another tab immediately
- [ ] Check Network: Events flushed on visibilitychange
- [ ] Close tab
- [ ] Check Network (Preserve log): Events flushed on pagehide

---

## Section 3: Heartbeat Tracking

### 3.1 Regular Heartbeats
- [ ] Open campaign page
- [ ] Keep tab active and focused
- [ ] Wait 30 seconds
- [ ] Check Network: POST `/api/analytics/heartbeat` sent
- [ ] Verify `time_increment`: 30
- [ ] Wait another 30 seconds
- [ ] Verify second heartbeat sent

### 3.2 Heartbeat Pause on Tab Switch
- [ ] Open campaign page
- [ ] Wait for first heartbeat (30s)
- [ ] Switch to another tab
- [ ] Wait 60 seconds
- [ ] Check Network: No heartbeats sent while hidden
- [ ] Switch back to campaign tab
- [ ] Verify heartbeat resumes

### 3.3 Heartbeat Flush on Tab Hide
- [ ] Open campaign page
- [ ] Wait for at least one heartbeat
- [ ] Switch to another tab
- [ ] Check Network: Final heartbeat sent on visibilitychange

### 3.4 Time Accumulation
- [ ] Create a session
- [ ] Keep page active for 2 minutes (4 heartbeats)
- [ ] Check database (or wait for worker):
  - [ ] `active_time_spent` ≈ 120 seconds
  - [ ] Worker processed heartbeats correctly

---

## Section 4: Session Flags

### 4.1 New Session → Actual Session
- [ ] Create a new session
- [ ] Keep page active for >10 seconds
- [ ] Trigger at least one heartbeat
- [ ] Wait for worker to process (or invoke manually)
- [ ] Check database: `session_flag` = 'actual_session'

### 4.2 Actual Session → Engaged Session
- [ ] Create session with >10 seconds time
- [ ] Click a button (trigger event)
- [ ] Wait for worker to process
- [ ] Check database: `session_flag` = 'engaged_session'

### 4.3 Bot Detection
- [ ] Create a session
- [ ] Close page immediately (<10 seconds)
- [ ] Check database: `session_flag` = 'new_session'
- [ ] Verify not counted in "Actual Sessions"

---

## Section 5: Rate Limiting

### 5.1 Session Creation Rate Limit
- [ ] Make 5 POST requests to `/api/analytics/session` in 1 minute
- [ ] Verify all succeed (200)
- [ ] Make 6th request within same minute
- [ ] Verify 429 Too Many Requests
- [ ] Verify `resetAt` in response

### 5.2 Events Rate Limit
- [ ] Send 50 POST requests to `/api/analytics/events` in 10 seconds
- [ ] Verify all succeed (200)
- [ ] Send 51st request within same window
- [ ] Verify 429 Too Many Requests

---

## Section 6: Deduplication

### 6.1 Duplicate Event Prevention
- [ ] Send same `event_id` twice to `/api/analytics/events`
- [ ] Wait for worker to process
- [ ] Check database: Only one event exists
- [ ] Verify UNIQUE constraint works

### 6.2 Duplicate Session Prevention
- [ ] Create session with same `session_id` twice
- [ ] Check database: Only one session exists
- [ ] Verify idempotency works

---

## Section 7: Analytics Dashboard

### 7.1 Analytics Display - ACTIVE Campaign
- [ ] Open campaign dashboard (ACTIVE campaign)
- [ ] Verify "Performance" section is visible
- [ ] Verify three cards display:
  - [ ] Total Actual Sessions
  - [ ] Total Engaged Sessions
  - [ ] Total Time Spent
- [ ] Verify data is formatted correctly
- [ ] Verify time is human-readable (e.g., "1h 15m")

### 7.2 Analytics Display - PAUSED Campaign
- [ ] Open campaign dashboard (PAUSED campaign)
- [ ] Verify "Performance" section is visible
- [ ] Verify analytics data displays correctly

### 7.3 Analytics Display - DRAFT Campaign
- [ ] Open campaign dashboard (DRAFT campaign)
- [ ] Verify "Performance" section is NOT visible
- [ ] Verify "Content" section is visible

### 7.4 Refresh Functionality
- [ ] Open campaign dashboard
- [ ] Note current analytics values
- [ ] Create new session/events in another browser
- [ ] Click "Refresh" button
- [ ] Verify loading state shows
- [ ] Verify analytics data updates
- [ ] Verify new values are correct

### 7.5 Error Handling
- [ ] Open campaign dashboard
- [ ] Temporarily break API endpoint
- [ ] Click "Refresh" button
- [ ] Verify error message displays
- [ ] Verify page still functions (can edit campaign)
- [ ] Fix API endpoint
- [ ] Click "Refresh" again
- [ ] Verify data loads successfully

### 7.6 Loading States
- [ ] Open campaign dashboard
- [ ] Verify skeleton UI shows during initial load
- [ ] Verify cards appear after data loads
- [ ] Click "Refresh"
- [ ] Verify loading indicator shows

---

## Section 8: Edge Cases

### 8.1 Multiple Tabs
- [ ] Open campaign page in Tab 1
- [ ] Copy URL and open in Tab 2 (same browser)
- [ ] Verify both tabs use same `session_id` (check cookies)
- [ ] Click button in Tab 1
- [ ] Click button in Tab 2
- [ ] Verify both events associated with same session

### 8.2 Network Failures
- [ ] Open campaign page
- [ ] Disconnect network
- [ ] Click button (event queued)
- [ ] Reconnect network
- [ ] Verify event is sent on reconnect
- [ ] Verify no data loss

### 8.3 Session Expiration
- [ ] Create a session
- [ ] Manually expire cookie (or wait 30+ minutes)
- [ ] Continue interacting
- [ ] Verify new session is created
- [ ] Verify old session marked with `ended_at`

### 8.4 Campaign Switching
- [ ] Open campaign page (Campaign A active)
- [ ] Create session for Campaign A
- [ ] Switch active campaign to Campaign B (in dashboard)
- [ ] Refresh campaign page
- [ ] Verify new session created for Campaign B

---

## Section 9: Worker Processing

### 9.1 Manual Worker Invocation
- [ ] Send events to Redis Stream
- [ ] Manually invoke Edge Function worker
- [ ] Verify events are processed
- [ ] Check database: Events inserted correctly
- [ ] Verify session flags updated

### 9.2 Heartbeat Processing
- [ ] Send heartbeats to Redis Stream
- [ ] Manually invoke Edge Function worker
- [ ] Verify heartbeats are processed
- [ ] Check database: `active_time_spent` updated
- [ ] Verify session flags updated

### 9.3 Deduplication in Worker
- [ ] Send duplicate event to Redis Stream
- [ ] Invoke worker
- [ ] Verify only one event in database
- [ ] Verify worker handles duplicates gracefully

---

## Section 10: Data Accuracy

### 10.1 Total Actual Sessions
- [ ] Create 3 sessions with >10 seconds each
- [ ] Create 2 sessions with <10 seconds each
- [ ] Wait for worker to process
- [ ] Check dashboard: Total Actual Sessions = 3
- [ ] Verify calculation is correct

### 10.2 Total Engaged Sessions
- [ ] Create 2 actual sessions with events
- [ ] Create 1 actual session without events
- [ ] Wait for worker to process
- [ ] Check dashboard: Total Engaged Sessions = 2
- [ ] Verify calculation is correct

### 10.3 Total Time Spent
- [ ] Create session 1: 120 seconds
- [ ] Create session 2: 90 seconds
- [ ] Create session 3: 45 seconds
- [ ] Wait for worker to process
- [ ] Check dashboard: Total Time Spent = 255 seconds
- [ ] Verify formatted as "4m 15s"

---

## Final Validation

- [ ] All test cases pass
- [ ] No console errors
- [ ] No API errors
- [ ] Redis Streams working
- [ ] Worker processes events correctly
- [ ] Analytics display correctly
- [ ] Error states don't break page
- [ ] Ready to apply migrations

---

## Notes

Document any issues found during testing:

1. **Issue**: 
   - **Steps to reproduce**:
   - **Expected behavior**:
   - **Actual behavior**:
   - **Fix required**:

2. **Issue**: 
   - **Steps to reproduce**:
   - **Expected behavior**:
   - **Actual behavior**:
   - **Fix required**:

---

## Sign-off

- [ ] All critical test cases pass
- [ ] All edge cases tested
- [ ] No blocking issues found
- [ ] Ready for migration application

**Tester**: _________________  
**Date**: _________________  
**Notes**: _________________

