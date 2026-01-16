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

  // Refresh session if expired - required for Server Components
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protect dashboard routes
  if (request.nextUrl.pathname.startsWith("/dashboard")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth";
      return NextResponse.redirect(url);
    }
  }

  // Redirect authenticated users away from auth page
  if (request.nextUrl.pathname.startsWith("/auth") && user) {
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

