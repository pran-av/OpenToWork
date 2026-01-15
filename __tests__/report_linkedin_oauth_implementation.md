# Test Suite for LinkedIn OAuth Implementation

## Overview

This test suite verifies the complete LinkedIn OAuth implementation, including:
- LinkedIn OAuth signup/login flow
- Manual identity linking for existing users
- Profile enrichment from LinkedIn data
- Secure cookie storage for LinkedIn sub (when email is not verified)
- Complete flow: LinkedIn OAuth → No Email → Magic Link → Link Identity

## Test Files

### 1. `lib/utils/__tests__/linkedin-sub-cookie.test.ts`

Tests the encrypted cookie storage utility for temporarily storing LinkedIn `sub` when email is not verified.

**Test Cases:**
- ✅ Encrypts and stores LinkedIn sub in cookie with proper security settings
- ✅ Uses secure cookies in production (httpOnly, secure, sameSite: Lax)
- ✅ Requires encryption key in production environment
- ✅ Accepts encryption key of any length (hashed to 32 bytes internally)
- ✅ Returns null if cookie does not exist
- ✅ Decrypts and returns sub from valid cookie
- ✅ Returns null if cookie is expired (auto-deletes expired cookies)
- ✅ Returns null if cookie is already used
- ✅ Handles decryption errors gracefully
- ✅ Deletes cookie when marking as used

**Security Features Verified:**
- AES-256-CBC encryption in production
- SHA-256 key derivation (supports any key length)
- HttpOnly cookies (prevents XSS attacks)
- Secure flag in production (HTTPS only)
- SameSite: Lax (allows OAuth redirects)
- 15-minute expiration

### 2. `lib/utils/__tests__/linkedin-oauth-flow.test.ts`

Tests the complete LinkedIn OAuth flow, including edge cases and integration scenarios.

**Test Cases:**

**Step 1: LinkedIn OAuth - No Verified Email**
- ✅ Stores LinkedIn sub when email is not verified
- ✅ Redirects to auth page with appropriate error message

**Step 2: Magic Link Authentication**
- ✅ Authenticates user via magic link
- ✅ Redirects to dashboard on successful authentication

**Step 3: Link Identity with Stored Sub**
- ✅ Uses stored LinkedIn sub when linking identity
- ✅ Handles linkIdentity callback with stored sub
- ✅ Enriches profile with LinkedIn data
- ✅ Marks stored sub as used after successful linking

**Complete Flow Integration**
- ✅ Completes full flow: LinkedIn OAuth → No Email → Magic Link → Link Identity
- ✅ Verifies sub storage, retrieval, and cleanup at each step

### 3. `lib/utils/__tests__/linkedin-encryption-production.test.ts`

Verifies that production encryption functions work correctly using real Node.js crypto.

**Test Cases:**
- ✅ Encrypts and decrypts data correctly using AES-256-CBC
- ✅ Generates different encrypted values for same data (IV uniqueness)
- ✅ Fails decryption with wrong key (security verification)

## Implementation Summary

### Backend (P0) ✅

**Migration Files:**
- `supabase/migrations/20260112000000_linkedin_oidc_schema.sql`
  - Added columns to `public.users`: `display_name`, `avatar_url`, `country`, `language`, `profile_completed`, `linkedin_id`, `profile_last_updated`
  - Created `public.provider_profiles` table for raw OAuth provider data
  - Created `public.user_identity_meta` table for tracking profile field sources
  - Added RLS policies

- `supabase/migrations/20260112000001_manual_linking_opted.sql`
  - Added `manual_linking_rejected` column to `public.users`

**API Routes:**
- `/api/auth/linkedin` - Initiates LinkedIn OAuth flow
- `/api/auth/v1/callback` - Handles LinkedIn OAuth callback
- `/api/auth/callback` - Handles magic link callbacks (refactored)
- `/api/auth/link-identity` - Initiates manual identity linking
- `/api/auth/link-identity/status` - Checks LinkedIn linking status
- `/api/auth/link-identity/dismiss` - Dismisses linking prompt
- `/api/profile` - Fetches and updates user profile

**Utilities:**
- `lib/utils/linkedin-sub-cookie.ts` - Encrypted cookie storage (AES-256-CBC)
- `lib/utils/enrich-profile.ts` - Profile enrichment from LinkedIn data
- `lib/utils/cookies.ts` - Cookie configuration (production-ready)

### Client Side (P0) ✅

**Components:**
- `app/auth/AuthPageContent.tsx` - "Continue with LinkedIn" button
- `components/dashboard/LinkIdentityDialog.tsx` - Manual linking dialog with countdown
- `components/dashboard/LinkIdentityBanner.tsx` - Banner orchestrator
- `components/dashboard/DashboardHeader.tsx` - Profile dropdown with avatar/name/CTA
- `components/dashboard/BackButton.tsx` - Back button below header

**Pages:**
- `app/dashboard/profile/page.tsx` - Profile management page
- `app/dashboard/page.tsx` - Dashboard with toast notifications

### Link Identity Flow (P1) ✅

**Features:**
- Manual linking dialog with 5-minute countdown timer
- Server-side `linkIdentity()` execution (uses HttpOnly cookies)
- Automatic profile enrichment after linking
- Toast notifications for success/failure
- Dismiss functionality (`manual_linking_rejected`)

**Flow:**
1. User clicks "Connect LinkedIn" → Server-side API generates OAuth URL
2. User authorizes on LinkedIn → Redirects to `/auth/v1/callback?link=true`
3. Code exchange → Session creation → Profile enrichment → Success redirect

### Profile Page (P2) ✅

**Features:**
- View and edit first name, last name, display name
- Display LinkedIn avatar if connected
- "Connect LinkedIn" CTA if not connected
- Save button enabled only when both first and last name are provided
- Auto-refresh header after profile save

### Dashboard Header Updates (P2) ✅

**Features:**
- Profile dropdown menu (replaces separate profile/logout buttons)
- Shows avatar if available
- Shows display name (truncated) if no avatar
- Shows "Update Profile" CTA if no profile data
- Dropdown contains: "Update Profile" and "Logout"
- Auto-closes dropdown after navigation

## Security Features

### Cookie Security
- **Encryption**: AES-256-CBC with SHA-256 key derivation
- **HttpOnly**: Always enabled (prevents XSS)
- **Secure**: Enabled in production (HTTPS only)
- **SameSite**: Lax (allows OAuth redirects)
- **Expiration**: 15 minutes (auto-cleanup)

### Environment Variables
- `LINKEDIN_SUB_ENCRYPTION_KEY` - Required in production (any length, hashed internally)
- `ENVIRONMENT` - Used to determine production vs development
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key

## Running Tests

```bash
# Run all tests once
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with UI
pnpm test:ui

# Run specific test file
pnpm test lib/utils/__tests__/linkedin-sub-cookie.test.ts
pnpm test lib/utils/__tests__/linkedin-oauth-flow.test.ts
pnpm test lib/utils/__tests__/linkedin-encryption-production.test.ts
```

## Test Results

**Current Status:** ✅ All tests passing

```
Test Files: 5 passed (5)
Tests: 32 passed (32)
```

### Test Coverage

1. **Cookie Storage & Encryption** (11 tests)
   - Storage, retrieval, expiration, security settings
   - Production vs development behavior
   - Error handling

2. **OAuth Flow Integration** (5 tests)
   - No verified email scenario
   - Magic link authentication
   - Identity linking with stored sub
   - Complete end-to-end flow

3. **Production Encryption Verification** (3 tests)
   - AES-256-CBC encryption/decryption
   - IV uniqueness
   - Key validation

4. **Other Test Suites** (13 tests)
   - Case study mapping tests
   - Campaign API route tests

## What the Tests Verify

1. **Encryption Works in Production**: Real crypto module tests verify AES-256-CBC encryption/decryption
2. **Cookie Security**: HttpOnly, Secure, SameSite settings are correct
3. **Flow Completeness**: Full user journey from LinkedIn OAuth to profile enrichment
4. **Error Handling**: Graceful handling of expired cookies, invalid data, missing keys
5. **Environment Awareness**: Different behavior in production vs development

## Implementation Checklist

### P0 Tasks ✅
- [x] LinkedIn OAuth backend implementation
- [x] Database migrations
- [x] API routes for OAuth flow
- [x] Client-side OAuth initiation
- [x] Callback handling
- [x] Profile enrichment utility

### P1 Tasks ✅
- [x] Manual identity linking flow
- [x] LinkIdentityDialog component
- [x] Server-side linkIdentity() execution
- [x] Toast notifications
- [x] Dismiss functionality

### P2 Tasks ✅
- [x] Profile page with form
- [x] Dashboard header updates
- [x] Profile enrichment verification
- [x] Auto-refresh header after save
- [x] Save button validation

## Production Readiness

✅ **Encryption**: AES-256-CBC with proper key management
✅ **Cookie Security**: HttpOnly, Secure, SameSite configured
✅ **Error Handling**: Comprehensive error messages and fallbacks
✅ **Testing**: Full test coverage for critical paths
✅ **Environment Variables**: Properly configured for production

## Notes

- LinkedIn OAuth uses `linkedin_oidc` provider name
- Redirect URI: `/auth/v1/callback` (Supabase internal callback)
- Profile enrichment only updates empty fields (doesn't overwrite existing data)
- Stored LinkedIn sub expires after 15 minutes
- Manual linking can be dismissed (stored in `manual_linking_rejected`)

All tests pass, confirming the implementation is working correctly! 🎉

