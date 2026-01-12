import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

/**
 * Handles magic link authentication callback at /auth/callback
 * LinkedIn OAuth callbacks are handled at /auth/v1/callback
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const token = requestUrl.searchParams.get("token");
  const type = requestUrl.searchParams.get("type");
  const next = requestUrl.searchParams.get("next") || "/dashboard";
  const errorParam = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");
  const errorCode = requestUrl.searchParams.get("error_code");

  // If Supabase returns an error in the callback
  if (errorParam) {
    console.error("Magic link callback error from Supabase:", errorParam, errorDescription);
    let errorMessage = "Authentication failed";
    if (errorParam === "token_not_found" || errorDescription?.includes("expired")) {
      errorMessage = "The magic link has expired. Please request a new one.";
    } else if (errorDescription) {
      errorMessage = errorDescription;
    }
    return NextResponse.redirect(
      new URL(`/auth?error=expired&details=${encodeURIComponent(errorMessage)}`, request.url)
    );
  }

  // Handle direct token (if Supabase redirects with token instead of code)
  // This shouldn't normally happen, but we'll handle it as a fallback
  if (token && type === "magiclink" && !code) {
    try {
      const supabase = await createServerClient();
      // Try to verify the token - Supabase should handle this via their verify endpoint
      // But if we get here, we'll redirect to Supabase's verify endpoint
      const verifyUrl = new URL(
        `/auth/v1/verify?token=${token}&type=${type}&redirect_to=${encodeURIComponent(requestUrl.origin + "/auth/callback")}`,
        process.env.NEXT_PUBLIC_SUPABASE_URL
      );
      return NextResponse.redirect(verifyUrl.toString());
    } catch (err) {
      console.error("Error handling token:", err);
      return NextResponse.redirect(
        new URL("/auth?error=token_error&details=Invalid token format", request.url)
      );
    }
  }

  // Handle magic link callback with code
  if (code) {
    try {
      const supabase = await createServerClient();
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        console.error("Error exchanging code for session:", error.message, error);
        return NextResponse.redirect(
          new URL(`/auth?error=auth_failed&details=${encodeURIComponent(error.message)}`, request.url)
        );
      }

      if (data.session) {
        const forwardedHost = request.headers.get("x-forwarded-host");
        const protocol = request.headers.get("x-forwarded-proto") || "http";
        const baseUrl = forwardedHost
          ? `${protocol}://${forwardedHost}`
          : request.url.split("/auth")[0];

        // Redirect to dashboard on successful authentication
        return NextResponse.redirect(new URL(next, baseUrl));
      } else {
        console.error("No session returned after code exchange");
        return NextResponse.redirect(
          new URL("/auth?error=auth_failed&details=No session created", request.url)
        );
      }
    } catch (err) {
      console.error("Unexpected error in magic link callback:", err);
      return NextResponse.redirect(
        new URL("/auth?error=auth_failed", request.url)
      );
    }
  }
  
  // Check if we have any error indicators
  if (errorCode || errorParam) {
    console.error("Supabase error detected:", { errorCode, errorParam, errorDescription });
  }
  
  return NextResponse.redirect(
    new URL(
      "/auth?error=expired&details=The magic link has expired or was already used. Please request a new one and click it immediately.",
      request.url
    )
  );
}

