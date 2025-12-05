import { createServerClient as createSupabaseServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getCookieOptions } from "@/lib/utils/cookies";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

/**
 * Creates a Supabase server client with SSR support (cookie-based auth)
 * Use this for authenticated routes and server components
 */
export async function createServerClient() {
  const cookieStore = await cookies();
  const cookieOptions = getCookieOptions();

  return createSupabaseServerClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      flowType: "pkce",
      detectSessionInUrl: false, // Server-side doesn't detect in URL
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            // Merge environment-specific cookie options
            const mergedOptions = {
              ...cookieOptions,
              ...options,
              // Ensure our security settings are applied
              httpOnly: cookieOptions.httpOnly,
              secure: cookieOptions.secure,
              sameSite: cookieOptions.sameSite,
            };
            cookieStore.set(name, value, mergedOptions);
          });
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  });
}

/**
 * Creates a simple Supabase client without auth (for public endpoints)
 * Use this for public API routes that don't need authentication
 */
export function createPublicClient() {
  const { createClient } = require("@supabase/supabase-js");
  return createClient(supabaseUrl, supabaseAnonKey);
}

