import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { noStoreJsonResponse } from "@/lib/utils/api-cache";

/**
 * API route to check if user has LinkedIn linked and manual linking preference
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

    // Check if user has LinkedIn identity linked
    const linkedinIdentity = user.identities?.find(
      (identity: any) => identity.provider === "linkedin_oidc"
    );
    const hasLinkedIn = !!linkedinIdentity;

    // Get user's manual linking preference from database
    const { data: userData, error: dbError } = await supabase
      .from("users")
      .select("manual_linking_rejected")
      .eq("user_id", user.id)
      .single();

    const manualLinkingRejected = userData?.manual_linking_rejected ?? false;

    return noStoreJsonResponse({
      hasLinkedIn,
      manualLinkingRejected,
    });
  } catch (error) {
    console.error("Error checking LinkedIn status:", error);
    return NextResponse.json(
      { error: "Failed to check LinkedIn status" },
      { status: 500 }
    );
  }
}

