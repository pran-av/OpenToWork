# Supabase Configuration for OpenToWork

## Required Configuration Steps

### 1. Redirect URL Configuration

To enable magic link authentication, you need to configure the redirect URL in your Supabase project:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: **OpenToWork**
3. Navigate to **Authentication** → **URL Configuration**
4. Under **Redirect URLs**, add the following URLs:

   **For Local Development:**
   ```
   http://localhost:3000/auth/callback
   ```

   **For Production (when deployed):**
   ```
   https://your-domain.com/auth/callback
   ```

5. Click **Save**

### 2. Email Templates (Optional)

Supabase uses default email templates for magic links. For production, you can customize these in:
- **Authentication** → **Email Templates** → **Magic Link**

### 3. Site URL

Make sure your **Site URL** is set correctly:
- **For Local Development:** `http://localhost:3000`
- **For Production:** `https://your-domain.com`

This can be found in **Authentication** → **URL Configuration** → **Site URL**

## Troubleshooting

### "Auth Failed" Error

If you see `auth_failed` errors:

1. **Check Redirect URL**: Ensure `http://localhost:3000/auth/callback` is added to the allowed redirect URLs in Supabase
2. **Check Email Link**: The magic link in your email must match the configured redirect URL
3. **Check Console**: Look at server logs for detailed error messages
4. **Verify Code Exchange**: The callback route logs errors - check your terminal/console

### Understanding the Magic Link Flow

1. **User requests magic link** → Email sent with link like:
   ```
   https://[project].supabase.co/auth/v1/verify?token=[token]&type=magiclink&redirect_to=http://localhost:3000/auth/callback
   ```

2. **User clicks link** → Goes to Supabase's `/auth/v1/verify` endpoint

3. **Supabase verifies token**:
   - ✅ **If valid**: Redirects to `redirect_to` with `?code=[session_code]`
   - ❌ **If expired/invalid**: Redirects to `redirect_to` without `code` (or with error params)

4. **Our callback receives request**:
   - With `code` → Exchanges for session → Success
   - Without `code` → Shows expired error

### Common Issues

- **Redirect URL mismatch**: The URL in the magic link email must exactly match one of the configured redirect URLs
- **Code expired**: Magic link codes expire after 5 minutes (as per PRD). Request a new link if expired
- **Site URL mismatch**: Ensure Site URL matches your application's base URL
- **"One-time token not found"**: This error means:
  - The magic link token expired (5 minute expiry)
  - The token was already used
  - The redirect URL in the email doesn't match your Supabase configuration
  - **Solution**: Request a new magic link and click it immediately
- **Callback without code parameter**: 
  - This happens when Supabase's verify endpoint fails but still redirects
  - Check server logs for full request details
  - Usually means token expired or was already used
  - **Solution**: Request a fresh magic link

## Testing

1. Start your Next.js dev server: `pnpm dev`
2. Navigate to `http://localhost:3000/auth`
3. Enter your email and click "Continue"
4. Check your email for the magic link
5. Click the link - it should redirect to `/auth/callback` and then to `/dashboard`

