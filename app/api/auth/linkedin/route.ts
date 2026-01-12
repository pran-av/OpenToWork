import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { noStoreJsonResponse } from "@/lib/utils/api-cache";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const origin = request.nextUrl.origin;
    const emailRedirectTo = `${origin}/auth/callback`;

    // Initiate LinkedIn OAuth flow
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "linkedin",
      options: {
        redirectTo: emailRedirectTo,
        // Request additional scopes if needed
        scopes: "openid profile email",
      },
    });

    if (error) {
      console.error("Error initiating LinkedIn OAuth:", error);
      const response = NextResponse.json(
        { error: error.message || "Failed to initiate LinkedIn OAuth" },
        { status: 400 }
      );
      response.headers.set("Cache-Control", "no-store, must-revalidate");
      return response;
    }

    if (!data.url) {
      const response = NextResponse.json(
        { error: "No OAuth URL returned" },
        { status: 500 }
      );
      response.headers.set("Cache-Control", "no-store, must-revalidate");
      return response;
    }

    // Redirect to LinkedIn OAuth URL
    return NextResponse.redirect(data.url);
  } catch (error) {
    console.error("Error in LinkedIn OAuth route:", error);
    const response = NextResponse.json(
      { error: "Failed to initiate LinkedIn OAuth" },
      { status: 500 }
    );
    response.headers.set("Cache-Control", "no-store, must-revalidate");
    return response;
  }
}

