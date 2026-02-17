import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getCookieOptionsForName } from "@/lib/utils/cookies";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: "pkce",
        detectSessionInUrl: false, // Middleware doesn't detect in URL
      },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          // Get cookie-specific options (code verifier uses "lax", auth tokens use "strict" in production)
          cookiesToSet.forEach(({ name, value, options }) => {
            const cookieOptions = getCookieOptionsForName(name);
            // Merge environment-specific cookie options
            const mergedOptions = {
              ...cookieOptions,
              ...options,
              // Ensure our security settings are applied
              httpOnly: cookieOptions.httpOnly,
              secure: cookieOptions.secure,
              sameSite: cookieOptions.sameSite,
            };
            supabaseResponse.cookies.set(name, value, mergedOptions);
          });
        },
      },
    }
  );

  // Skip middleware processing for API routes (they handle auth themselves)
  const isApiRoute = request.nextUrl.pathname.startsWith("/api");
  
  // Refresh session if expired - required for Server Components
  // Only call getUser for non-API routes to avoid interfering with API route handlers
  const {
    data: { user },
  } = isApiRoute ? { data: { user: null } } : await supabase.auth.getUser();

  // Protect dashboard routes (page routes only, not API routes)
  if (request.nextUrl.pathname.startsWith("/dashboard") && !isApiRoute) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth";
      return NextResponse.redirect(url);
    }

    // Check if user is anonymous - if so, flush cookies and redirect to auth
    // Skip this check for API routes - they handle anonymous checks themselves
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        let isAnonymous = false;
        try {
          // Use atob for edge runtime compatibility
          const base64Url = session.access_token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
          const decoded = atob(padded);
          const jwtPayload = JSON.parse(decoded);
          isAnonymous = jwtPayload.is_anonymous === true;
        } catch (jwtError) {
          // Fall back to user object flags if JWT decode fails
          isAnonymous = session.user?.is_anonymous === true;
        }

        if (isAnonymous) {
          // Flush anonymous cookies
          await supabase.auth.signOut();
          
          // Redirect to auth page
          const url = request.nextUrl.clone();
          url.pathname = "/auth";
          return NextResponse.redirect(url);
        }
      }
    } catch (error) {
      // On error, continue with normal flow to avoid blocking legitimate users
      console.error("[middleware] Error checking anonymous auth:", error);
    }
  }

  // Redirect authenticated users away from auth page (page routes only)
  if (request.nextUrl.pathname.startsWith("/auth") && !isApiRoute && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

  
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Static files (svg, png, jpg, jpeg, gif, webp)
     * - /auth/callback (Supabase magic link callback)
     * - /auth/v1/callback (LinkedIn OAuth callback)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|auth/callback|auth/v1/callback).*)",
  ],
};

