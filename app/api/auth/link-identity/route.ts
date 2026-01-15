import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getLinkedInSub } from "@/lib/utils/linkedin-sub-cookie";

/**
 * API route to initiate manual LinkedIn identity linking using linkIdentity()
 * 
 * This route runs linkIdentity() on the server side where we can read HttpOnly cookies.
 * It returns the OAuth URL to the client, which then redirects to LinkedIn.
 * 
 * The actual linking is handled in /auth/v1/callback when link=true is present.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    
    // Verify user is authenticated (can read HttpOnly cookies on server)
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Check if user already has LinkedIn linked
    const linkedinIdentity = user.identities?.find(
      (identity: any) => identity.provider === "linkedin_oidc"
    );

    if (linkedinIdentity) {
      return NextResponse.json(
        { error: "LinkedIn is already linked to this account" },
        { status: 400 }
      );
    }

    const origin = request.nextUrl.origin;
    const redirectTo = `${origin}/auth/v1/callback?link=true`;

    // Get session to ensure we have a valid JWT
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session || !session.access_token) {
      // console.error("Error getting session for linkIdentity:", sessionError);
      return NextResponse.json(
        { error: "Session not found or invalid" },
        { status: 401 }
      );
    }


    // Try to use linkIdentity() on server side
    // Note: linkIdentity() may not be available in server clients, but we'll try
    // If it fails, we'll fall back to signInWithOAuth()
    try {
      // @ts-ignore - linkIdentity() might not be in server client types but may work at runtime
      const { data, error } = await supabase.auth.linkIdentity({
        provider: "linkedin_oidc",
        options: {
          redirectTo: redirectTo,
        },
      });

      if (error) {
        console.error("[LinkIdentity Server] linkIdentity() error:", error);
        // Fall back to signInWithOAuth if linkIdentity() fails
        throw error;
      }

      if (!data?.url) {
        return NextResponse.json(
          { error: "No OAuth URL returned from linkIdentity()" },
          { status: 500 }
        );
      }

      // console.log("[LinkIdentity Server] ✅ linkIdentity() succeeded, returning URL");
      // Return URL as JSON so client can redirect
      return NextResponse.json({ url: data.url });
    } catch (linkIdentityError: any) {
      // Fallback: use signInWithOAuth() if linkIdentity() is not available
      // console.log("[LinkIdentity Server] linkIdentity() not available, falling back to signInWithOAuth()");
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "linkedin_oidc",
        options: {
          redirectTo: redirectTo,
        },
      });

      if (error) {
        console.error("Error initiating LinkedIn identity linking:", error);
        return NextResponse.json(
          { error: error.message || "Failed to initiate LinkedIn linking" },
          { status: 400 }
        );
      }

      if (!data.url) {
        return NextResponse.json(
          { error: "No OAuth URL returned" },
          { status: 500 }
        );
      }

      // Return URL as JSON so client can redirect
      return NextResponse.json({ url: data.url });
    }
  } catch (error) {
    console.error("Error in link identity route:", error);
    return NextResponse.json(
      { error: "Failed to initiate identity linking" },
      { status: 500 }
    );
  }
}

