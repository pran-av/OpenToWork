"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

interface SessionCheckResponse {
  hasSession: boolean;
  isAnonymous: boolean;
  userId?: string;
  error?: string;
}

/**
 * Initialize anonymous authentication for guest users
 * PRD Requirement: Check if permanent user exists first, then check for anonymous user, then sign in anonymously
 * 
 * IMPORTANT: This function first checks server-side (can read httpOnly cookies like LinkedIn OAuth segmented cookies)
 * before checking client-side. This ensures LinkedIn OAuth sessions are properly detected.
 * 
 * @param supabase - Supabase client instance
 * @param context - Context string for logging (e.g., "CampaignFlow", "CallToAction")
 * @returns Promise<boolean> - true if user is authenticated (permanent or anonymous), false otherwise
 */
export async function ensureAnonymousAuth(
  supabase: SupabaseClient,
  context: string = "Auth"
): Promise<boolean> {
  try {
    // console.log(`[${context}] Starting auth initialization...`);
    
    // Step 1: Check server-side session first (can read httpOnly cookies including segmented cookies like auth-token.0, auth-token.1)
    // This is critical for LinkedIn OAuth which uses httpOnly segmented cookies that client-side getSession() cannot read
    try {
      const serverCheckResponse = await fetch("/api/auth/check-session", {
        method: "GET",
        credentials: "include", // Include cookies in request
      });
      
      if (serverCheckResponse.ok) {
        const serverCheck: SessionCheckResponse = await serverCheckResponse.json();
        
        if (serverCheck.hasSession) {
          // Server found a session (can be permanent or anonymous)
          // console.log(`[${context}] Server-side session found:`, {
          //   isAnonymous: serverCheck.isAnonymous,
          //   userId: serverCheck.userId,
          // });
          
          // If permanent user session exists, skip anonymous sign-in
          if (!serverCheck.isAnonymous) {
            // console.log(`[${context}] Permanent user session detected on server - skipping anonymous sign-in`);
            return true;
          }
          
          // If anonymous session exists, reuse it
          if (serverCheck.isAnonymous) {
            // console.log(`[${context}] Anonymous user session already exists on server - reusing session`);
            return true;
          }
        }
      }
    } catch (serverCheckError) {
      // If server check fails, fall back to client-side check
      // console.warn(`[${context}] Server-side session check failed, falling back to client-side:`, serverCheckError);
    }
    
    // Step 2: Fallback to client-side session check (for Magic Link and other non-httpOnly cookie scenarios)
    const { data: { session: existingSession }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      // console.error(`[${context}] Error getting session:`, sessionError);
    }
    
    if (existingSession) {
      // Decode JWT to check is_anonymous claim
      let isAnonymous = false;
      try {
        const jwtPayload = JSON.parse(atob(existingSession.access_token.split('.')[1]));
        isAnonymous = jwtPayload.is_anonymous === true;
        
        // console.log(`[${context}] Client-side session found:`, {
        //   user_id: existingSession.user?.id,
        //   email: existingSession.user?.email,
        //   is_anonymous: existingSession.user?.is_anonymous,
        //   jwt_is_anonymous: jwtPayload.is_anonymous,
        //   role: jwtPayload.role,
        // });
        
        // PRD Requirement: Check if this is a permanent user (is_anonymous = false)
        if (!isAnonymous) {
          // console.log(`[${context}] Permanent user session detected - skipping anonymous sign-in`);
          return true;
        }
        
        // PRD Requirement: Check if this is already an anonymous user (is_anonymous = true)
        if (isAnonymous) {
          // console.log(`[${context}] Anonymous user session already exists - reusing session`);
          return true;
        }
      } catch (jwtError) {
        // console.error(`[${context}] Error decoding JWT:`, jwtError);
        // If we can't decode JWT, fall back to user object flags to avoid duplicate anonymous sign-in
        if (existingSession.user?.is_anonymous === false) {
          // console.log(`[${context}] Permanent user detected from user object - skipping anonymous sign-in`);
          return true;
        }
        if (existingSession.user?.is_anonymous === true) {
          // console.log(`[${context}] Anonymous user detected from user object - reusing session`);
          return true;
        }
        // Unknown state: assume session is valid and reuse to avoid creating duplicates
        // console.warn(`[${context}] JWT decode failed and user anonymity unknown - reusing existing session to avoid duplicate anon sign-in`);
        return true;
      }
    }
    
    // Step 3: PRD Requirement - If cookies for neither guest nor permanent user exist, sign in anonymously
    // console.log(`[${context}] No valid session found (neither server-side nor client-side), signing in anonymously...`);
    
    // Sign in anonymously via server-side API route (sets httpOnly cookies)
    // This ensures cookies are set with httpOnly: true, secure: true (production), sameSite: strict
    try {
      const signInResponse = await fetch("/api/auth/anonymous-signin", {
        method: "POST",
        credentials: "include", // Include cookies in request
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!signInResponse.ok) {
        const errorData = await signInResponse.json().catch(() => ({}));
        // console.error(`[${context}] Error signing in anonymously:`, {
        //   status: signInResponse.status,
        //   error: errorData.error || "Unknown error",
        // });
        return false;
      }
      
      const signInData = await signInResponse.json();
      
      if (signInData.success) {
        // console.log(`[${context}] Anonymous sign-in successful:`, {
        //   userId: signInData.userId,
        //   isAnonymous: signInData.isAnonymous,
        //   expiresAt: signInData.expiresAt,
        // });
        
        // Cookies are set server-side with httpOnly: true, secure: true (production), sameSite: strict
        // The browser will automatically include these cookies in subsequent requests
        return true;
      } else {
        // console.warn(`[${context}] Sign-in returned success: false`, signInData);
        return false;
      }
    } catch (fetchError) {
      // console.error(`[${context}] Error calling anonymous sign-in API:`, fetchError);
      return false;
    }
  } catch (error) {
    // console.error(`[${context}] Unexpected error during auth initialization:`, error);
    return false;
  }
}

/**
 * Simple check if user is authenticated (either permanent or anonymous)
 * Use this for quick verification before critical operations
 * 
 * @param supabase - Supabase client instance
 * @returns Promise<boolean> - true if user exists, false otherwise
 */
export async function checkUserExists(supabase: SupabaseClient): Promise<boolean> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      // console.error("[Auth] Error checking user:", error);
      return false;
    }
    return !!user;
  } catch (error) {
    // console.error("[Auth] Unexpected error checking user:", error);
    return false;
  }
}

