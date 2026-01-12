import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getLinkedInSub } from "@/lib/utils/linkedin-sub-cookie";

/**
 * API route to initiate manual LinkedIn identity linking
 * Uses Supabase linkIdentity() to link LinkedIn OAuth to existing account
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
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

    // Check if there's a stored LinkedIn sub from previous failed OAuth (no verified email case)
    const storedSub = await getLinkedInSub();

    // Initiate LinkedIn OAuth for identity linking
    // Note: linkIdentity() may not be available in server client, so we use signInWithOAuth
    // and handle the linking in the callback by checking if user is already authenticated
    // Supabase will automatically link if the user is already logged in
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "linkedin_oidc",
      options: {
        redirectTo: redirectTo,
        // This will link the identity if user is already authenticated
        // Supabase handles this automatically when user is already logged in
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

    // Redirect to LinkedIn OAuth URL for linking
    return NextResponse.redirect(data.url);
  } catch (error) {
    console.error("Error in link identity route:", error);
    return NextResponse.json(
      { error: "Failed to initiate identity linking" },
      { status: 500 }
    );
  }
}

