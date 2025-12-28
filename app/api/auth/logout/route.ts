import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { noStoreJsonResponse } from "@/lib/utils/api-cache";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      const response = NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
      response.headers.set("Cache-Control", "no-store, must-revalidate");
      return response;
    }

    return noStoreJsonResponse({ success: true });
  } catch (error) {
    console.error("Error during logout:", error);
    const response = NextResponse.json(
      { error: "Failed to logout" },
      { status: 500 }
    );
    response.headers.set("Cache-Control", "no-store, must-revalidate");
    return response;
  }
}


