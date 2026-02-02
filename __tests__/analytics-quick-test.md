# Analytics Quick Test Guide

A streamlined testing guide for quick validation before migrations.

## 5-Minute Smoke Test

### Step 1: Basic Flow (2 minutes)
1. Open campaign page in incognito browser
2. Open DevTools → Network tab
3. Verify:
   - ✅ POST `/api/analytics/session` returns 200
   - ✅ Cookie `otw_analytics_session` is set
   - ✅ Initial `link_open` event is sent
4. Click a service button
5. Verify:
   - ✅ Event is sent (may be batched)
   - ✅ Event metadata is correct

### Step 2: Heartbeat (1 minute)
1. Keep page active for 30 seconds
2. Verify:
   - ✅ POST `/api/analytics/heartbeat` sent after 30s
   - ✅ `time_increment`: 30

### Step 3: Dashboard (2 minutes)
1. Open campaign dashboard (ACTIVE campaign)
2. Verify:
   - ✅ "Performance" section visible
   - ✅ Three analytics cards display
   - ✅ Data loads (or shows loading state)
3. Click "Refresh" button
4. Verify:
   - ✅ Loading state shows
   - ✅ Data refreshes (or error displays gracefully)

---

## 15-Minute Comprehensive Test

### Phase 1: Session & Events (5 min)
- [ ] Session creation works
- [ ] Cookie properties correct
- [ ] Events are batched
- [ ] Events flush on tab switch
- [ ] Event metadata is correct

### Phase 2: Heartbeats (5 min)
- [ ] Heartbeats sent every 30s
- [ ] Heartbeats pause on tab switch
- [ ] Heartbeats flush on tab hide
- [ ] Time accumulates correctly

### Phase 3: Dashboard (5 min)
- [ ] Analytics display for ACTIVE/PAUSED
- [ ] Analytics hidden for DRAFT
- [ ] Refresh button works
- [ ] Error states don't break page
- [ ] Loading states work

---

## Critical Path Test

Test these scenarios in order - if any fail, fix before proceeding:

1. **Session Creation** (Must work)
   - Open page → Session created → Cookie set

2. **Event Tracking** (Must work)
   - Click button → Event sent → Appears in Redis

3. **Heartbeat** (Must work)
   - Wait 30s → Heartbeat sent → Time tracked

4. **Worker Processing** (Must work)
   - Events in Redis → Worker processes → Data in DB

5. **Dashboard Display** (Must work)
   - Open dashboard → Analytics display → Refresh works

---

## Pre-Migration Checklist

Before applying migrations, verify:

- [ ] All API endpoints respond (200/202, not 500)
- [ ] No console errors in browser
- [ ] Cookies are set correctly
- [ ] Events appear in Redis Streams (if accessible)
- [ ] Worker can be invoked manually
- [ ] Dashboard shows analytics (or loading/error states)
- [ ] Error states don't break page functionality

---

## Post-Migration Verification

After applying migrations:

1. **Database Check** (2 min)
   ```sql
   -- Verify tables exist
   SELECT * FROM internal.sessions LIMIT 1;
   SELECT * FROM internal.events LIMIT 1;
   
   -- Verify functions exist
   SELECT routine_name FROM information_schema.routines 
   WHERE routine_schema = 'public' 
   AND routine_name LIKE '%analytics%';
   ```

2. **End-to-End Test** (3 min)
   - Create session → Send events → Process with worker → View in dashboard

3. **Error Recovery** (2 min)
   - Break API → Verify error handling → Fix API → Verify recovery

---

## Common Issues Quick Fix

| Issue | Quick Check | Fix |
|-------|-------------|-----|
| No session created | Check Network tab | Verify API route exists |
| Events not sending | Check console errors | Verify Redis connection |
| Analytics not showing | Check campaign status | Must be ACTIVE/PAUSED |
| Worker not processing | Check Edge Function logs | Verify worker is deployed |
| Rate limit errors | Check request frequency | Wait for window to reset |

---

## Test Data Setup

### Create Test Campaign
```sql
-- Get a test project
SELECT project_id FROM public.projects LIMIT 1;

-- Create test campaign (if needed)
INSERT INTO public.campaigns (project_id, campaign_name, campaign_status, ...)
VALUES (...);
```

### Verify Test Data
```sql
-- Check sessions
SELECT COUNT(*) FROM internal.sessions WHERE campaign_id = 'YOUR_CAMPAIGN_ID';

-- Check events
SELECT COUNT(*) FROM internal.events e
JOIN internal.sessions s ON e.session_id = s.session_id
WHERE s.campaign_id = 'YOUR_CAMPAIGN_ID';
```

---

## Success Criteria

✅ **Ready for Migration if:**
- All API endpoints work
- Events are tracked correctly
- Heartbeats are sent
- Dashboard displays analytics
- Error states are handled gracefully
- No blocking issues found

❌ **Not Ready if:**
- API endpoints return 500 errors
- Events are not tracked
- Heartbeats are not sent
- Dashboard breaks on errors
- Critical functionality is broken

