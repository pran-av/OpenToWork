import { NextRequest, NextResponse } from "next/server";

/**
 * Server-side proxy for Supabase magic link verification.
 * This prevents exposing the Supabase project URL directly to the client.
 *
 * Usage:
 *   Client (or callback route) redirects to:
 *     /api/auth/verify?token=...&type=magiclink&redirect_to=https%3A%2F%2Fwww.pitchlikethis.com%2Fauth%2Fcallback
 *
 *   This route then calls the Supabase /auth/v1/verify endpoint on the server,
 *   reads its Location header (redirect_to with ?code=...), and forwards that
 *   redirect back to the client.
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get("token");
    const type = url.searchParams.get("type") ?? "magiclink";
    const redirectTo =
      url.searchParams.get("redirect_to") ??
      `${url.origin}/auth/callback`;

    if (!token) {
      return NextResponse.redirect(
        new URL("/auth?error=token_error&details=Missing token", url.origin),
      );
    }

    const supabaseBaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseBaseUrl) {
      console.error("[auth/verify] Missing NEXT_PUBLIC_SUPABASE_URL");
      return NextResponse.redirect(
        new URL(
          "/auth?error=token_error&details=Server configuration error",
          url.origin,
        ),
      );
    }

    const supabaseVerifyUrl = new URL("/auth/v1/verify", supabaseBaseUrl);
    supabaseVerifyUrl.searchParams.set("token", token);
    supabaseVerifyUrl.searchParams.set("type", type);
    supabaseVerifyUrl.searchParams.set("redirect_to", redirectTo);

    const res = await fetch(supabaseVerifyUrl.toString(), {
      // Do not auto-follow redirects; we want to proxy the Location header
      redirect: "manual",
    });

    // Supabase verify should almost always respond with a redirect
    const location = res.headers.get("location");
    if (location) {
      return NextResponse.redirect(location, res.status === 301 ? 301 : 302);
    }

    // Fallback: if no Location header, surface a generic error
    console.error(
      "[auth/verify] Supabase verify returned no Location header",
      res.status,
    );
    return NextResponse.redirect(
      new URL(
        "/auth?error=auth_failed&details=Verification failed",
        url.origin,
      ),
    );
  } catch (error) {
    console.error("[auth/verify] Unexpected error:", error);
    const url = new URL(request.url);
    return NextResponse.redirect(
      new URL(
        "/auth?error=auth_failed&details=Verification error",
        url.origin,
      ),
    );
  }
}

