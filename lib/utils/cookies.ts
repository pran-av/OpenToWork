/**
 * Get cookie options based on environment
 * Production: HttpOnly=true, Secure=true, SameSite=Strict (for auth tokens) or Lax (for code verifier)
 * Development: HttpOnly=true, Secure=false, SameSite=Lax
 */
export function getCookieOptions() {
  const isProduction = process.env.ENVIRONMENT === "production" || process.env.NODE_ENV === "production";

  return {
    httpOnly: true, // Always HttpOnly for security
    secure: isProduction, // Secure only in production (HTTPS required)
    sameSite: isProduction ? ("strict" as const) : ("lax" as const),
    path: "/",
  };
}

/**
 * Check if a cookie is a code verifier cookie (needs sameSite: "lax" for PKCE flow)
 * Supabase SSR uses pattern: sb-{project-ref}-auth-token-code-verifier
 */
export function isCodeVerifierCookie(cookieName: string): boolean {
  return cookieName.includes("-code-verifier");
}

/**
 * Get cookie options for a specific cookie name
 * Code verifier cookies use "lax" in production to allow redirects from Supabase
 * Auth token cookies use "strict" in production for CSRF protection
 */
export function getCookieOptionsForName(cookieName: string) {
  const isProduction = process.env.ENVIRONMENT === "production" || process.env.NODE_ENV === "production";
  const isCodeVerifier = isCodeVerifierCookie(cookieName);

  return {
    httpOnly: true, // Always HttpOnly for security
    secure: isProduction, // Secure only in production (HTTPS required)
    // Code verifier needs "lax" to work with Supabase redirects, auth tokens use "strict" for security
    sameSite: isProduction 
      ? (isCodeVerifier ? ("lax" as const) : ("strict" as const))
      : ("lax" as const),
    path: "/",
  };
}

