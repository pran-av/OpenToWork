import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { noStoreJsonResponse } from "@/lib/utils/api-cache";

/**
 * Server-side endpoint to check if a session exists
 * This can read httpOnly cookies (including segmented cookies like auth-token.0, auth-token.1)
 * Used by client-side code to determine if anonymous sign-in should be skipped
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    
    // Check for existing session (reads from httpOnly cookies)
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      return noStoreJsonResponse({ 
        hasSession: false,
        isAnonymous: false,
        error: sessionError.message 
      });
    }
    
    if (!session) {
      return noStoreJsonResponse({ 
        hasSession: false,
        isAnonymous: false 
      });
    }
    
    // Decode JWT to check is_anonymous claim
    let isAnonymous = false;
    try {
      const jwtPayload = JSON.parse(Buffer.from(session.access_token.split('.')[1], 'base64').toString());
      isAnonymous = jwtPayload.is_anonymous === true;
    } catch (jwtError) {
      // Fall back to user object flags if JWT decode fails
      isAnonymous = session.user?.is_anonymous === true;
    }
    
    return noStoreJsonResponse({ 
      hasSession: true,
      isAnonymous,
      userId: session.user?.id 
    });
  } catch (error) {
    console.error("Error checking session:", error);
    return noStoreJsonResponse({ 
      hasSession: false,
      isAnonymous: false,
      error: "Internal server error" 
    });
  }
}

