/**
 * Server-only: get the Supabase JWT for Agent API calls.
 * Used by /api/agent/* routes to forward Authorization: Bearer <token> to the Agent Service.
 */

import { createServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export type GetAgentAccessTokenResult =
  | { token: string; error?: never }
  | { token: null; error: string };

/**
 * Returns the current user's Supabase access_token (JWT) for use with the Agent Service.
 * Tries getSession() first; if session is null (e.g. cookie chunking/format issues), tries
 * to parse the auth cookie directly so the outbound request to the Agent always has a token
 * when the user is authenticated.
 */
export async function getAgentAccessToken(): Promise<GetAgentAccessTokenResult> {
  const supabase = await createServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return { token: null, error: "Authentication required" };
  }

  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (session?.access_token) {
    return { token: session.access_token };
  }
  if (sessionError) {
    console.error("[agent-auth] getSession error:", sessionError.message);
  }

  // Fallback: read auth token from cookie when getSession() returns null (e.g. chunked cookie format)
  try {
    const cookieStore = await cookies();
    const all = cookieStore.getAll();

    const decodeCookieValue = (value: string): string => {
      let raw = value;
      if (raw.startsWith("base64-")) raw = raw.slice(7);
      else if (raw.startsWith("base64url-")) raw = raw.slice(10);
      const base64 = raw.replace(/-/g, "+").replace(/_/g, "/");
      const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
      return Buffer.from(padded, "base64").toString("utf8");
    };

    const parseSession = (decoded: string): string | null => {
      try {
        const parsed = JSON.parse(decoded) as { access_token?: string };
        return parsed?.access_token ?? null;
      } catch {
        return null;
      }
    };

    // Chunked: sb-*-auth-token.0, .1, ...
    const chunkCookies = all
      .filter((c) => /^sb-[^-]+-auth-token\.\d+$/.test(c.name))
      .sort((a, b) => {
        const i = parseInt(a.name.split(".").pop() ?? "0", 10);
        const j = parseInt(b.name.split(".").pop() ?? "0", 10);
        return i - j;
      });
    if (chunkCookies.length > 0) {
      const combined = chunkCookies
        .map((c) => {
          let v = c.value;
          if (v.startsWith("base64-")) v = v.slice(7);
          else if (v.startsWith("base64url-")) v = v.slice(10);
          return v.replace(/-/g, "+").replace(/_/g, "/");
        })
        .join("");
      const paddedCombined = combined + "=".repeat((4 - (combined.length % 4)) % 4);
      const decodedCombined = Buffer.from(paddedCombined, "base64").toString("utf8");
      const token = parseSession(decodedCombined);
      if (token) return { token };
    }

    // Single cookie: sb-*-auth-token (no .0 suffix)
    const singleAuthCookie = all.find((c) => /^sb-[^-]+-auth-token$/.test(c.name));
    if (singleAuthCookie?.value) {
      const decoded = decodeCookieValue(singleAuthCookie.value);
      const token = parseSession(decoded);
      if (token) return { token };
    }
  } catch (e) {
    console.error("[agent-auth] Cookie fallback parse error:", e);
  }

  return { token: null, error: "Session required" };
}
