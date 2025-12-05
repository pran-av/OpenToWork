# PKCE Flow Implementation

This document outlines how PKCE (Proof Key for Code Exchange) flow is implemented according to [Supabase PKCE Flow documentation](https://supabase.com/docs/guides/auth/sessions/pkce-flow).

## Implementation Status

### ✅ Implemented

1. **Code Exchange**: Using `exchangeCodeForSession(code)` in callback route
2. **PKCE Flow Type**: Explicitly set `flowType: 'pkce'` in all Supabase clients
3. **Server-Side Storage**: Using cookies via `@supabase/ssr` for code verifier storage
4. **Session Detection**: `detectSessionInUrl: true` on browser client
5. **5-Minute Code Validity**: Handled by Supabase (codes expire after 5 minutes)
6. **Single-Use Codes**: Enforced by Supabase (codes can only be exchanged once)

### Configuration Details

#### Browser Client (`lib/supabase/client.ts`)
```typescript
{
  auth: {
    flowType: "pkce",
    detectSessionInUrl: true, // Automatically detects and exchanges code from URL
  }
}
```

#### Server Client (`lib/supabase/server.ts`)
```typescript
{
  auth: {
    flowType: "pkce",
    detectSessionInUrl: false, // Server-side doesn't detect in URL
  },
  cookies: {
    // Cookie-based storage for code verifier
  }
}
```

#### Middleware (`middleware.ts`)
```typescript
{
  auth: {
    flowType: "pkce",
    detectSessionInUrl: false,
  },
  cookies: {
    // Cookie-based storage
  }
}
```

## How PKCE Works in Our Implementation

1. **User requests magic link** → Server API route (`/api/auth/magic-link`) calls `signInWithOtp()`
   - Code verifier is created and stored in cookies (via `@supabase/ssr`)
   - Magic link email is sent

2. **User clicks magic link** → Redirects to Supabase `/auth/v1/verify`
   - Supabase verifies the token
   - If valid, redirects to our callback with `?code=[session_code]`

3. **Callback receives code** → `/auth/callback` route
   - Uses `exchangeCodeForSession(code)` to exchange code for session
   - Code verifier (stored in cookies) is sent along with code
   - Session is created and stored in HttpOnly cookies

4. **Session Management** → Middleware refreshes sessions automatically
   - Uses PKCE flow type for all session operations
   - Cookies are HttpOnly and Secure

## Critical Requirements Met

✅ **Code verifier stored locally**: Stored in cookies via `@supabase/ssr`  
✅ **Same browser/device**: Code verifier in cookies ensures same browser  
✅ **5-minute expiry**: Handled by Supabase  
✅ **Single-use codes**: Enforced by Supabase  
✅ **Server-side compatible**: Using cookies instead of localStorage  
✅ **Automatic code detection**: Browser client has `detectSessionInUrl: true`

## Important Notes

- **Code verifier must be in same browser**: This is ensured by storing it in cookies
- **Magic link initiation**: Currently done server-side, but code verifier is stored in cookies which are browser-specific
- **Code exchange**: Must happen on same browser where flow started (ensured by cookies)

## References

- [Supabase PKCE Flow Documentation](https://supabase.com/docs/guides/auth/sessions/pkce-flow)
- [OAuth 2.0 PKCE Specification](https://oauth.net/2/pkce/)

