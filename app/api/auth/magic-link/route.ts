import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { noStoreJsonResponse } from "@/lib/utils/api-cache";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string" || !email.trim()) {
      const response = NextResponse.json(
        { error: "Valid email is required" },
        { status: 400 }
      );
      response.headers.set("Cache-Control", "no-store, must-revalidate");
      return response;
    }

    // Use server client with PKCE support for proper code verifier handling
    const supabase = await createServerClient();

    const origin = request.nextUrl.origin;
    // console.log("origin", origin);
    const emailRedirectTo = `${origin}/auth/callback`;

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo,
      },
    });

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
    console.error("Error sending magic link:", error);
    const response = NextResponse.json(
      { error: "Failed to send magic link" },
      { status: 500 }
    );
    response.headers.set("Cache-Control", "no-store, must-revalidate");
    return response;
  }
}


