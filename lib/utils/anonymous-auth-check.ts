/**
 * Server-side utility to check if user is anonymous and flush cookies if needed.
 * Used in Studio routes to ensure anonymous users are redirected to auth.
 */

import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export interface AnonymousCheckResult {
  isAnonymous: boolean;
  cookiesFlushed: boolean;
  redirectResponse?: NextResponse;
}

/**
 * Checks if the current user is anonymous (is_anonymous = true in JWT).
 * If anonymous, flushes auth cookies and returns a redirect response.
 * 
 * @param redirectTo - Path to redirect to (default: '/auth')
 * @param isApiRoute - If true, returns JSON response with redirect info instead of NextResponse.redirect
 * @returns Object with isAnonymous flag, cookiesFlushed flag, and optional redirectResponse
 */
export async function checkAndFlushAnonymousAuth(
  redirectTo: string = "/auth",
  isApiRoute: boolean = false
): Promise<AnonymousCheckResult> {
  try {
    const supabase = await createServerClient();
    
    // Get session to check JWT
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      // No session, not anonymous (just not authenticated)
      return { isAnonymous: false, cookiesFlushed: false };
    }

    // Decode JWT to check is_anonymous claim
    let isAnonymous = false;
    try {
      // Use atob for edge runtime compatibility (works in both Node.js and Edge)
      const base64Url = session.access_token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
      const decoded = atob(padded);
      const jwtPayload = JSON.parse(decoded);
      isAnonymous = jwtPayload.is_anonymous === true;
    } catch (jwtError) {
      // Fall back to user object flags if JWT decode fails
      isAnonymous = session.user?.is_anonymous === true;
    }

    // If not anonymous, no action needed
    if (!isAnonymous) {
      return { isAnonymous: false, cookiesFlushed: false };
    }

    // User is anonymous - flush cookies
    const { error: signOutError } = await supabase.auth.signOut();
    
    if (signOutError) {
      console.error("[anonymous-auth-check] Error flushing anonymous cookies:", signOutError);
      // Still return as if flushed - the error is logged
    }

    // Create redirect response based on route type
    let redirectResponse: NextResponse | undefined;
    
    if (isApiRoute) {
      // For API routes, return JSON with redirect info that client can handle
      redirectResponse = NextResponse.json(
        {
          error: "Authentication required",
          redirect: redirectTo,
          message: "Login or Signup required",
        },
        { status: 401 }
      );
    } else {
      // For page requests (middleware), return redirect response
      redirectResponse = NextResponse.redirect(new URL(redirectTo, process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'));
    }

    return {
      isAnonymous: true,
      cookiesFlushed: true,
      redirectResponse,
    };
  } catch (error) {
    console.error("[anonymous-auth-check] Error checking anonymous auth:", error);
    // On error, assume not anonymous to avoid blocking legitimate users
    return { isAnonymous: false, cookiesFlushed: false };
  }
}
