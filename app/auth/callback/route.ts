import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { enrichProfileFromLinkedIn } from "@/lib/utils/enrich-profile";
import { storeLinkedInSub, markLinkedInSubAsUsed } from "@/lib/utils/linkedin-sub-cookie";

/**
 * Handles magic link authentication callback at /auth/callback
 * Also handles LinkedIn OAuth callbacks when Supabase redirects here (production fallback)
 * Primary LinkedIn OAuth callback is at /auth/v1/callback
 */
export async function GET(request: NextRequest) {
  console.error("[Auth Callback] Route called", {
    url: request.url,
    pathname: request.nextUrl.pathname,
    timestamp: new Date().toISOString(),
  });
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
        const response = NextResponse.redirect(
          new URL(`/auth?error=auth_failed&details=${encodeURIComponent(error.message)}`, request.url)
        );
        response.headers.set("X-Debug-Error", "exchange_code_failed");
        response.headers.set("X-Debug-RouteExecuted", "yes");
        return response;
      }

      if (data.session) {
        const user = data.session.user;
        const forwardedHost = request.headers.get("x-forwarded-host");
        const protocol = request.headers.get("x-forwarded-proto") || "http";
        const baseUrl = forwardedHost
          ? `${protocol}://${forwardedHost}`
          : request.url.split("/auth")[0];

        // Check if this is a LinkedIn OAuth login (production fallback)
        // Supabase might redirect LinkedIn OAuth to /auth/callback instead of /auth/v1/callback
        const linkedinIdentity = user.identities?.find(
          (identity: any) => identity.provider === "linkedin_oidc"
        );

        if (linkedinIdentity) {
          console.error("[Auth Callback] Detected LinkedIn OAuth flow - handling as LinkedIn callback");
          
          // This is a LinkedIn OAuth login - handle it like /auth/v1/callback
          const profileBootstrapData = {
            ...(user.user_metadata || {}),
          };

          // Check if email is verified
          const email = profileBootstrapData.email || user.email;
          const emailVerified = profileBootstrapData.email_verified === true && email;

          if (!email || !emailVerified) {
            // LinkedIn didn't provide verified email
            const sub = profileBootstrapData.sub || linkedinIdentity.id;
            if (sub) {
              await storeLinkedInSub(sub);
            }
            const response = NextResponse.redirect(
              new URL(
                `/auth?error=linkedin_no_email&details=${encodeURIComponent(
                  "Your LinkedIn account did not provide a verified email. Please sign up using magic link."
                )}`,
                baseUrl
              )
            );
            response.headers.set("X-Debug-LinkedInOAuth", "no_email");
            response.headers.set("X-Debug-RouteExecuted", "yes");
            return response;
          }

          // Email is verified - enrich profile (use existing supabase client with session)
          let enrichLogs: any[] = [];
          try {
            const linkedinProfileData = {
              sub: profileBootstrapData.sub || linkedinIdentity.id,
              email: email,
              email_verified: emailVerified,
              name: profileBootstrapData.name,
              given_name: profileBootstrapData.given_name,
              family_name: profileBootstrapData.family_name,
              picture: profileBootstrapData.picture,
              locale: profileBootstrapData.locale,
            };

            enrichLogs = await enrichProfileFromLinkedIn(user.id, linkedinProfileData, supabase) || [];
            await markLinkedInSubAsUsed();
          } catch (enrichError) {
            console.error("[Auth Callback] LinkedIn enrichment error", enrichError);
            if (enrichLogs && Array.isArray(enrichLogs)) {
              enrichLogs.push({
                level: "error" as const,
                message: "Enrichment failed with exception",
                data: {
                  error: enrichError instanceof Error ? enrichError.message : String(enrichError),
                },
                timestamp: new Date().toISOString(),
              });
            }
          }

          // Redirect to dashboard with logs in URL
          const redirectUrl = new URL(next, baseUrl);
          redirectUrl.searchParams.set("_enrichTest", "1");
          
          if (enrichLogs && enrichLogs.length > 0) {
            try {
              const logsJson = JSON.stringify(enrichLogs);
              const maxLogSize = 1500;
              const truncatedLogs = logsJson.length > maxLogSize 
                ? enrichLogs.slice(0, Math.floor((enrichLogs.length * maxLogSize) / logsJson.length))
                : enrichLogs;
              const finalLogsJson = JSON.stringify(truncatedLogs);
              const logsBase64 = Buffer.from(finalLogsJson).toString("base64url");
              
              const testUrl = new URL(next, baseUrl);
              testUrl.searchParams.set("enrichLogs", logsBase64);
              if (testUrl.toString().length < 2000) {
                redirectUrl.searchParams.set("enrichLogs", logsBase64);
              }
            } catch (encodeError) {
              console.error("[Auth Callback] Failed to encode logs", encodeError);
            }
          }

          const response = NextResponse.redirect(redirectUrl);
          response.headers.set("X-Debug-LinkedInOAuth", "handled");
          response.headers.set("X-Debug-EnrichLogs", enrichLogs && enrichLogs.length > 0 ? "yes" : "no");
          response.headers.set("X-Debug-LogsCount", String(enrichLogs?.length || 0));
          response.headers.set("X-Debug-RouteExecuted", "yes");
          return response;
        }

        // Regular magic link flow - redirect to dashboard
        const response = NextResponse.redirect(new URL(next, baseUrl));
        response.headers.set("X-Debug-MagicLink", "handled");
        response.headers.set("X-Debug-RouteExecuted", "yes");
        return response;
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

