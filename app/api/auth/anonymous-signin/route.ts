import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { noStoreJsonResponse } from "@/lib/utils/api-cache";
import { getCookieOptionsForName } from "@/lib/utils/cookies";

/**
 * POST /api/auth/anonymous-signin
 * Server-side anonymous sign-in endpoint
 * Sets httpOnly cookies with secure flags for anonymous users
 * 
 * Cookie options:
 * - httpOnly: true (security - prevents XSS access)
 * - secure: true in production (HTTPS only)
 * - sameSite: strict (CSRF protection, no token verification needed)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    
    // Check if session already exists (avoid duplicate anonymous users)
    const { data: { session: existingSession }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error("[Anonymous Sign-In] Error checking existing session:", sessionError);
      return NextResponse.json(
        { error: "Failed to check session" },
        { status: 500 }
      );
    }
    
    if (existingSession) {
      // Decode JWT to check if it's anonymous
      let isAnonymous = false;
      try {
        const jwtPayload = JSON.parse(Buffer.from(existingSession.access_token.split('.')[1], 'base64').toString());
        isAnonymous = jwtPayload.is_anonymous === true;
      } catch (jwtError) {
        // Fall back to user object flags
        isAnonymous = existingSession.user?.is_anonymous === true;
      }
      
      // If permanent user exists, don't create anonymous user
      if (!isAnonymous) {
        return noStoreJsonResponse({
          success: false,
          error: "Permanent user session already exists",
          userId: existingSession.user?.id,
        });
      }
      
      // If anonymous session already exists, return success
      if (isAnonymous) {
        return noStoreJsonResponse({
          success: true,
          userId: existingSession.user?.id,
          isAnonymous: true,
          message: "Anonymous session already exists",
        });
      }
    }
    
    // Sign in anonymously (server-side)
    const { data: signInData, error: signInError } = await supabase.auth.signInAnonymously();
    
    if (signInError) {
      console.error("[Anonymous Sign-In] Error signing in anonymously:", signInError);
      return NextResponse.json(
        { error: signInError.message || "Failed to sign in anonymously" },
        { status: 500 }
      );
    }
    
    if (!signInData?.session) {
      return NextResponse.json(
        { error: "No session returned from anonymous sign-in" },
        { status: 500 }
      );
    }
    
    // Verify is_anonymous claim
    let isAnonymous = false;
    try {
      const jwtPayload = JSON.parse(Buffer.from(signInData.session.access_token.split('.')[1], 'base64').toString());
      isAnonymous = jwtPayload.is_anonymous === true;
      
      if (!isAnonymous) {
        console.warn("[Anonymous Sign-In] WARNING: is_anonymous claim is not true in JWT!");
      }
    } catch (jwtError) {
      // Fall back to user object flags
      isAnonymous = signInData.session.user?.is_anonymous === true;
    }
    
    // Cookies are automatically set by createServerClient's setAll callback
    // with httpOnly: true, secure: true (production), sameSite: strict
    // via getCookieOptionsForName() in lib/utils/cookies.ts
    
    return noStoreJsonResponse({
      success: true,
      userId: signInData.session.user?.id,
      isAnonymous,
      expiresAt: signInData.session.expires_at,
    });
  } catch (error) {
    console.error("[Anonymous Sign-In] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

