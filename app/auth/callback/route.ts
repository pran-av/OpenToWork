import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const token = requestUrl.searchParams.get("token");
  const type = requestUrl.searchParams.get("type");
  const next = requestUrl.searchParams.get("next") || "/dashboard";
  const errorParam = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");
  const errorCode = requestUrl.searchParams.get("error_code");

  // Log full request details for debugging
  console.log("=== Auth Callback Debug ===");
  //console.log("Full request URL:", request.url);
  //console.log("Parsed URL:", requestUrl.toString());
  //console.log("All search params:", Object.fromEntries(requestUrl.searchParams));
  //console.log("Headers:", {
  //  referer: request.headers.get("referer"),
  //  userAgent: request.headers.get("user-agent"),
  //  host: request.headers.get("host"),
  //});
  console.log("Parameters:", {
    hasCode: !!code,
    //code: code ? `${code.substring(0, 10)}...` : null,
    hasToken: !!token,
    //token: token ? `${token.substring(0, 10)}...` : null,
    type,
    errorParam,
    errorDescription,
    errorCode,
  });
  console.log("========================");

  // If Supabase returns an error in the callback
  if (errorParam) {
    console.error("Auth callback error from Supabase:", errorParam, errorDescription);
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
    console.log("Received token directly, attempting to verify...");
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
        console.log("Session created successfully for user:", data.session.user.id);
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
      console.error("Unexpected error in auth callback:", err);
      return NextResponse.redirect(
        new URL("/auth?error=auth_failed", request.url)
      );
    }
  }

  // If there's no code and no token, this might be:
  // 1. User manually navigated to /auth/callback
  // 2. Old/expired magic link (Supabase verify failed but redirected anyway)
  // 3. Redirect URL mismatch
  // 4. Token was already used
  // 5. Supabase verify endpoint failed silently
  console.warn("Auth callback called without code or token parameter");
  console.warn("This usually means:");
  console.warn("  - The magic link expired (5 minute limit)");
  console.warn("  - The token was already used");
  console.warn("  - Supabase verify endpoint failed before redirecting");
  console.warn("  - Redirect URL mismatch in Supabase config");
  
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

