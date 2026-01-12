import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { enrichProfileFromLinkedIn } from "@/lib/utils/enrich-profile";
import { storeLinkedInSub, markLinkedInSubAsUsed } from "@/lib/utils/linkedin-sub-cookie";

/**
 * Handles LinkedIn OAuth callback at /auth/v1/callback
 * This route is specifically for LinkedIn OAuth (linkedin_oidc provider)
 * Magic link flows continue to use /auth/callback
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") || "/dashboard";
  const errorParam = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");
  const errorCode = requestUrl.searchParams.get("error_code");

  // If LinkedIn returns an error in the callback
  if (errorParam) {
    console.error("LinkedIn OAuth callback error:", errorParam, errorDescription);
    let errorMessage = "LinkedIn authentication failed";
    if (errorDescription) {
      errorMessage = errorDescription;
    }
    return NextResponse.redirect(
      new URL(`/auth?error=linkedin_auth_failed&details=${encodeURIComponent(errorMessage)}`, request.url)
    );
  }

  // Handle LinkedIn OAuth callback with code
  if (code) {
    try {
      const supabase = await createServerClient();
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        console.error("Error exchanging LinkedIn OAuth code for session:", error.message, error);
        return NextResponse.redirect(
          new URL(`/auth?error=auth_failed&details=${encodeURIComponent(error.message)}`, request.url)
        );
      }

      if (data.session) {
        const user = data.session.user;
        const forwardedHost = request.headers.get("x-forwarded-host");
        const protocol = request.headers.get("x-forwarded-proto") || "http";
        const baseUrl = forwardedHost
          ? `${protocol}://${forwardedHost}`
          : request.url.split("/auth")[0];

        // Check if this is a LinkedIn OAuth login (should always be true for this route)
        const linkedinIdentity = user.identities?.find(
          (identity: any) => identity.provider === "linkedin_oidc"
        );

        if (linkedinIdentity) {
          // This is a LinkedIn OAuth login
          // Get LinkedIn OIDC data from user_metadata
          const profileBootstrapData = {
            ...user.user_metadata,
          };

          // Check if email is verified
          const email = profileBootstrapData.email || user.email;
          const emailVerified = profileBootstrapData.email_verified === true && email;

          if (!email || !emailVerified) {
            // LinkedIn didn't provide verified email
            // Store sub temporarily for later linking
            const sub = profileBootstrapData.sub || linkedinIdentity.id;
            if (sub) {
              await storeLinkedInSub(sub);
            }

            return NextResponse.redirect(
              new URL(
                `/auth?error=linkedin_no_email&details=${encodeURIComponent(
                  "Your LinkedIn account did not provide a verified email. Please sign up using magic link."
                )}`,
                request.url
              )
            );
          }

          // Email is verified - enrich profile and proceed
          try {
            await enrichProfileFromLinkedIn(user.id, {
              sub: profileBootstrapData.sub || linkedinIdentity.id,
              email: email,
              email_verified: emailVerified,
              name: profileBootstrapData.name,
              given_name: profileBootstrapData.given_name,
              family_name: profileBootstrapData.family_name,
              picture: profileBootstrapData.picture,
              locale: profileBootstrapData.locale,
            });

            // Mark any pending sub as used (if it exists)
            await markLinkedInSubAsUsed();
          } catch (enrichError) {
            console.error("Error enriching profile from LinkedIn:", enrichError);
            // Don't fail the auth flow if enrichment fails
          }
        }

        // Redirect to dashboard on successful authentication
        return NextResponse.redirect(new URL(next, baseUrl));
      } else {
        console.error("No session returned after LinkedIn OAuth code exchange");
        return NextResponse.redirect(
          new URL("/auth?error=auth_failed&details=No session created", request.url)
        );
      }
    } catch (err) {
      console.error("Unexpected error in LinkedIn OAuth callback:", err);
      return NextResponse.redirect(
        new URL("/auth?error=auth_failed", request.url)
      );
    }
  }
  
  // If there's no code, redirect to auth page with error
  if (errorCode || errorParam) {
    console.error("LinkedIn OAuth error detected:", { errorCode, errorParam, errorDescription });
  }
  
  return NextResponse.redirect(
    new URL(
      "/auth?error=linkedin_auth_failed&details=No authorization code received from LinkedIn. Please try again.",
      request.url
    )
  );
}

