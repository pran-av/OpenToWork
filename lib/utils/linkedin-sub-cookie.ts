/**
 * Utility for storing LinkedIn sub temporarily in encrypted cookie
 * Used when LinkedIn OAuth doesn't provide verified email
 * Cookie expires in 15 minutes
 */

import { cookies } from "next/headers";
import { getCookieOptionsForName } from "./cookies";

const LINKEDIN_SUB_COOKIE_NAME = "linkedin_pending_sub";
const COOKIE_TTL_SECONDS = 15 * 60; // 15 minutes

interface LinkedInSubData {
  provider: string;
  sub: string;
  created_at: number;
  expires_at: number;
  used: boolean;
}

/**
 * Store LinkedIn sub in encrypted cookie
 * Note: In a production environment, you'd want to use proper encryption
 * For now, we'll use base64 encoding (not secure, but works for dev)
 * TODO: Implement proper encryption using crypto or a library like jose
 */
export async function storeLinkedInSub(sub: string): Promise<void> {
  const cookieStore = await cookies();
  const expiresAt = Date.now() + COOKIE_TTL_SECONDS * 1000;
  
  const data: LinkedInSubData = {
    provider: "linkedin",
    sub,
    created_at: Date.now(),
    expires_at: expiresAt,
    used: false,
  };

  // Base64 encode (in production, use proper encryption)
  const encoded = Buffer.from(JSON.stringify(data)).toString("base64");
  
  const cookieOptions = getCookieOptionsForName(LINKEDIN_SUB_COOKIE_NAME);
  cookieStore.set(LINKEDIN_SUB_COOKIE_NAME, encoded, {
    ...cookieOptions,
    maxAge: COOKIE_TTL_SECONDS,
  });
}

/**
 * Retrieve and validate LinkedIn sub from cookie
 * Returns null if cookie doesn't exist, is expired, or already used
 */
export async function getLinkedInSub(): Promise<string | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(LINKEDIN_SUB_COOKIE_NAME);
  
  if (!cookie?.value) {
    return null;
  }

  try {
    // Decode from base64
    const decoded = Buffer.from(cookie.value, "base64").toString("utf-8");
    const data: LinkedInSubData = JSON.parse(decoded);

    // Check if expired
    if (Date.now() > data.expires_at) {
      await deleteLinkedInSub();
      return null;
    }

    // Check if already used
    if (data.used) {
      return null;
    }

    return data.sub;
  } catch (error) {
    console.error("Error parsing LinkedIn sub cookie:", error);
    await deleteLinkedInSub();
    return null;
  }
}

/**
 * Mark LinkedIn sub as used and delete cookie
 */
export async function markLinkedInSubAsUsed(): Promise<void> {
  await deleteLinkedInSub();
}

/**
 * Delete LinkedIn sub cookie
 */
export async function deleteLinkedInSub(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(LINKEDIN_SUB_COOKIE_NAME);
}

