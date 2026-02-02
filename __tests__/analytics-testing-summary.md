# Analytics Testing Summary

## Overview

This document provides a quick reference for testing the analytics system before applying database migrations. All testing materials are ready for use.

## Testing Materials Created

### 1. **Comprehensive Testing Guide** (`analytics-testing-guide.md`)
   - Detailed test scenarios for all features
   - Edge case testing procedures
   - Database verification queries
   - Redis Stream verification
   - API testing with cURL
   - Browser DevTools testing
   - Common issues and solutions

### 2. **Manual Test Checklist** (`analytics-manual-test-checklist.md`)
   - Step-by-step checklist format
   - Organized by feature sections
   - Checkboxes for tracking progress
   - Issue documentation template
   - Sign-off section

### 3. **Quick Test Guide** (`analytics-quick-test.md`)
   - 5-minute smoke test
   - 15-minute comprehensive test
   - Critical path test
   - Pre/post migration checklists
   - Common issues quick fix

### 4. **Test Utilities** (`analytics-test-utilities.ts`)
   - Helper functions for testing
   - Mock data generators
   - Verification functions
   - Test payload creators

### 5. **API Testing Script** (`scripts/test-analytics-api.sh`)
   - Automated API endpoint testing
   - Rate limiting verification
   - Response validation
   - Usage: `PROJECT_ID=xxx CAMPAIGN_ID=xxx ./scripts/test-analytics-api.sh`

## Recommended Testing Flow

### Phase 1: Quick Validation (5-10 minutes)
1. Run the **5-Minute Smoke Test** from `analytics-quick-test.md`
2. Verify basic functionality works
3. Check for obvious errors

### Phase 2: Comprehensive Testing (30-60 minutes)
1. Follow the **Manual Test Checklist** (`analytics-manual-test-checklist.md`)
2. Test all scenarios systematically
3. Document any issues found

### Phase 3: Edge Cases (15-30 minutes)
1. Test edge cases from `analytics-testing-guide.md`
2. Verify error handling
3. Test recovery scenarios

### Phase 4: Integration Testing (15-30 minutes)
1. Test full end-to-end flow
2. Verify worker processing
3. Check dashboard display
4. Validate data accuracy

## Critical Test Scenarios (Must Pass)

These scenarios must work before applying migrations:

1. ✅ **Session Creation**
   - Page load creates session
   - Cookie is set correctly
   - Session ID is returned

2. ✅ **Event Tracking**
   - Button clicks are tracked
   - Events are batched
   - Events appear in Redis Stream

3. ✅ **Heartbeat Tracking**
   - Heartbeats sent every 30s
   - Heartbeats pause on tab switch
   - Time accumulates correctly

4. ✅ **Worker Processing**
   - Worker can be invoked
   - Events are processed
   - Data appears in database

5. ✅ **Dashboard Display**
   - Analytics show for ACTIVE/PAUSED
   - Analytics hidden for DRAFT
   - Refresh button works
   - Errors don't break page

## Pre-Migration Checklist

Before applying migrations, ensure:

- [ ] All critical test scenarios pass
- [ ] No console errors in browser
- [ ] No API 500 errors
- [ ] Redis Streams are accessible
- [ ] Edge Function can be invoked
- [ ] Dashboard displays correctly
- [ ] Error states are handled gracefully
- [ ] All test documentation reviewed

## Testing Tools

### Browser DevTools
- **Network Tab**: Monitor API requests
- **Application Tab**: Check cookies
- **Console Tab**: Check for errors

### Database Queries
Use queries from `analytics-testing-guide.md` to verify:
- Sessions are created
- Events are stored
- Analytics calculations are correct

### Redis Verification
- Check streams: `XINFO STREAM analytics:events`
- Check consumer groups: `XINFO GROUPS analytics:events`
- View messages: `XRANGE analytics:events - +`

### API Testing
- Use `scripts/test-analytics-api.sh` for automated testing
- Use cURL commands from testing guide
- Use test utilities from `analytics-test-utilities.ts`

## Common Test Scenarios

### Scenario 1: Basic User Journey
```
1. User opens campaign page
2. Session created → Cookie set
3. User clicks service button
4. Event sent → Batched
5. User navigates to step 2
6. User clicks case study
7. Event sent
8. User clicks Connect
8. Event sent
9. User waits 30 seconds
10. Heartbeat sent
11. User closes tab
12. Final heartbeat sent
13. Worker processes events
14. Dashboard shows analytics
```

### Scenario 2: Time Tracking
```
1. User opens campaign page
2. Keep page active for 2 minutes
3. Verify 4 heartbeats sent (every 30s)
4. Worker processes heartbeats
5. Database shows active_time_spent ≈ 120s
6. Session flag = 'actual_session'
```

### Scenario 3: Error Recovery
```
1. User opens campaign page
2. Break API endpoint temporarily
3. User clicks buttons (events queued)
4. Fix API endpoint
5. Events are sent successfully
6. No data loss
```

## Issue Tracking

When you find issues during testing:

1. **Document the issue** in the checklist
2. **Note steps to reproduce**
3. **Identify the fix needed**
4. **Fix the issue**
5. **Re-test to verify fix**
6. **Update checklist**

## Next Steps

1. **Review Testing Materials**
   - Read `analytics-quick-test.md` for quick start
   - Review `analytics-testing-guide.md` for details
   - Use `analytics-manual-test-checklist.md` for systematic testing

2. **Run Tests**
   - Start with 5-minute smoke test
   - Progress to comprehensive testing
   - Test edge cases
   - Verify integration

3. **Fix Issues**
   - Document all issues
   - Fix critical issues first
   - Re-test after fixes

4. **Apply Migrations**
   - Only after all critical tests pass
   - Verify post-migration functionality
   - Test end-to-end flow

## Testing Resources

- **Comprehensive Guide**: `__tests__/analytics-testing-guide.md`
- **Manual Checklist**: `__tests__/analytics-manual-test-checklist.md`
- **Quick Test**: `__tests__/analytics-quick-test.md`
- **Test Utilities**: `__tests__/analytics-test-utilities.ts`
- **API Test Script**: `scripts/test-analytics-api.sh`

## Support

If you encounter issues during testing:
1. Check "Common Issues and Solutions" in the testing guide
2. Review error messages in browser console
3. Check API response codes in Network tab
4. Verify environment variables are set
5. Check Redis and Supabase connectivity

---

**Ready to test?** Start with the **5-Minute Smoke Test** in `analytics-quick-test.md`!

