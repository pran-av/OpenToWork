import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { noStoreJsonResponse } from "@/lib/utils/api-cache";

/**
 * API route to mark user as opted out of manual linking
 */
export async function POST(request: NextRequest) {
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

    // Update user's manual_linking_rejected to true (user dismissed the dialog)
    const { error: updateError } = await supabase
      .from("users")
      .update({ manual_linking_rejected: true })
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Error updating manual_linking_rejected:", updateError);
      return NextResponse.json(
        { error: "Failed to update preference" },
        { status: 500 }
      );
    }

    return noStoreJsonResponse({ success: true });
  } catch (error) {
    console.error("Error dismissing link identity:", error);
    return NextResponse.json(
      { error: "Failed to dismiss link identity" },
      { status: 500 }
    );
  }
}

