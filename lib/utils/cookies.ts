/**
 * Get cookie options based on environment
 * Production: HttpOnly=true, Secure=true, SameSite=Strict
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

