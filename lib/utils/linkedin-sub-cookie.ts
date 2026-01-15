/**
 * Utility for storing LinkedIn sub temporarily in encrypted cookie
 * Used when LinkedIn OAuth doesn't provide verified email
 * Cookie expires in 15 minutes
 */

import { cookies } from "next/headers";
import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";

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
 * Get encryption key from environment variable
 * In production, this should be set as an environment variable
 * Falls back to a default key in development (not secure, but acceptable for dev)
 * Uses SHA-256 hash to ensure key is always 32 bytes for AES-256
 */
function getEncryptionKey(): Buffer {
  const key = process.env.LINKEDIN_SUB_ENCRYPTION_KEY;
  
  if (!key) {
    if (process.env.NODE_ENV === "production" || process.env.ENVIRONMENT === "production") {
      throw new Error("LINKEDIN_SUB_ENCRYPTION_KEY environment variable is required in production");
    }
    // Development fallback - hash to ensure 32 bytes
    return createHash("sha256")
      .update("dev-key-default-for-linkedin-sub-cookie-encryption")
      .digest();
  }
  
  // Hash the key to ensure it's exactly 32 bytes for AES-256
  // This allows any length key to be used
  return createHash("sha256").update(key).digest();
}

/**
 * Encrypt data using AES-256-CBC
 */
function encrypt(data: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(16); // Initialization vector
  const cipher = createCipheriv("aes-256-cbc", key, iv);
  
  let encrypted = cipher.update(data, "utf-8", "hex");
  encrypted += cipher.final("hex");
  
  // Prepend IV to encrypted data (IV doesn't need to be secret)
  return iv.toString("hex") + ":" + encrypted;
}

/**
 * Decrypt data using AES-256-CBC
 */
function decrypt(encryptedData: string): string {
  const key = getEncryptionKey();
  const [ivHex, encrypted] = encryptedData.split(":");
  
  if (!ivHex || !encrypted) {
    throw new Error("Invalid encrypted data format");
  }
  
  const iv = Buffer.from(ivHex, "hex");
  const decipher = createDecipheriv("aes-256-cbc", key, iv);
  
  let decrypted = decipher.update(encrypted, "hex", "utf-8");
  decrypted += decipher.final("utf-8");
  
  return decrypted;
}

/**
 * Get cookie options for LinkedIn sub cookie
 * Uses Lax sameSite to allow redirects from LinkedIn OAuth
 */
function getLinkedInSubCookieOptions() {
  const isProduction = process.env.ENVIRONMENT === "production" || process.env.NODE_ENV === "production";
  
  return {
    httpOnly: true, // Always HttpOnly for security
    secure: isProduction, // Secure only in production (HTTPS required)
    sameSite: "lax" as const, // Lax to allow redirects from LinkedIn
    path: "/",
  };
}

/**
 * Store LinkedIn sub in encrypted cookie
 * Uses AES-256-CBC encryption for production security
 */
export async function storeLinkedInSub(sub: string): Promise<void> {
  const cookieStore = await cookies();
  const expiresAt = Date.now() + COOKIE_TTL_SECONDS * 1000;
  
  const data: LinkedInSubData = {
    provider: "linkedin_oidc",
    sub,
    created_at: Date.now(),
    expires_at: expiresAt,
    used: false,
  };

  // Encrypt the data
  const encrypted = encrypt(JSON.stringify(data));
  
  const cookieOptions = getLinkedInSubCookieOptions();
  cookieStore.set(LINKEDIN_SUB_COOKIE_NAME, encrypted, {
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
    // Decrypt the data
    const decrypted = decrypt(cookie.value);
    const data: LinkedInSubData = JSON.parse(decrypted);

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

