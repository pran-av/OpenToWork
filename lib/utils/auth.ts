"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Initialize anonymous authentication for guest users
 * PRD Requirement: Check if permanent user exists first, then check for anonymous user, then sign in anonymously
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
    console.log(`[${context}] Starting auth initialization...`);
    
    // Step 1: Check existing session (reads from cookies)
    const { data: { session: existingSession }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error(`[${context}] Error getting session:`, sessionError);
    }
    
    if (existingSession) {
      // Decode JWT to check is_anonymous claim
      let isAnonymous = false;
      try {
        const jwtPayload = JSON.parse(atob(existingSession.access_token.split('.')[1]));
        isAnonymous = jwtPayload.is_anonymous === true;
        
        console.log(`[${context}] Existing session found:`, {
          user_id: existingSession.user?.id,
          email: existingSession.user?.email,
          is_anonymous: existingSession.user?.is_anonymous,
          jwt_is_anonymous: jwtPayload.is_anonymous,
          role: jwtPayload.role,
        });
        
        // PRD Requirement: Check if this is a permanent user (is_anonymous = false)
        if (!isAnonymous) {
          console.log(`[${context}] Permanent user session detected - skipping anonymous sign-in`);
          return true;
        }
        
        // PRD Requirement: Check if this is already an anonymous user (is_anonymous = true)
        if (isAnonymous) {
          console.log(`[${context}] Anonymous user session already exists - reusing session`);
          return true;
        }
      } catch (jwtError) {
        console.error(`[${context}] Error decoding JWT:`, jwtError);
        // If we can't decode JWT, fall back to user object flags to avoid duplicate anonymous sign-in
        if (existingSession.user?.is_anonymous === false) {
          console.log(`[${context}] Permanent user detected from user object - skipping anonymous sign-in`);
          return true;
        }
        if (existingSession.user?.is_anonymous === true) {
          console.log(`[${context}] Anonymous user detected from user object - reusing session`);
          return true;
        }
        // Unknown state: assume session is valid and reuse to avoid creating duplicates
        console.warn(`[${context}] JWT decode failed and user anonymity unknown - reusing existing session to avoid duplicate anon sign-in`);
        return true;
      }
    }
    
    // Step 2: PRD Requirement - If cookies for neither guest nor permanent user exist, sign in anonymously
    console.log(`[${context}] No valid session found, signing in anonymously...`);
    
    // Sign in anonymously (this will set cookies via @supabase/ssr)
    const { data: signInData, error: signInError } = await supabase.auth.signInAnonymously();
    
    if (signInError) {
      console.error(`[${context}] Error signing in anonymously:`, {
        message: signInError.message,
        status: signInError.status,
        name: signInError.name,
        fullError: signInError,
      });
      return false;
    }
    
    if (signInData?.session) {
      console.log(`[${context}] Anonymous sign-in successful:`, {
        user_id: signInData.session.user?.id,
        email: signInData.session.user?.email,
        is_anonymous: signInData.session.user?.is_anonymous,
        access_token: signInData.session.access_token ? "present" : "missing",
        expires_at: signInData.session.expires_at,
      });
      
      // Decode JWT to verify is_anonymous claim
      try {
        const jwtPayload = JSON.parse(atob(signInData.session.access_token.split('.')[1]));
        console.log(`[${context}] JWT payload after anonymous sign-in:`, {
          sub: jwtPayload.sub,
          email: jwtPayload.email,
          is_anonymous: jwtPayload.is_anonymous,
          role: jwtPayload.role,
          exp: jwtPayload.exp,
        });
        
        if (jwtPayload.is_anonymous !== true) {
          console.warn(`[${context}] WARNING: is_anonymous claim is not true in JWT!`);
        }
        
        // PRD Note: Cookie is set automatically by @supabase/ssr
        // Cookie name: 'sb-{project-ref}-auth-token' (same for both anonymous and permanent users)
        // This is expected behavior - Supabase uses same cookie structure for both
        console.log(`[${context}] Session cookie should be set by @supabase/ssr automatically`);
      } catch (jwtError) {
        console.error(`[${context}] Error decoding JWT after sign-in:`, jwtError);
      }
      
      return true;
    } else {
      console.warn(`[${context}] Sign-in returned no session data`);
      return false;
    }
  } catch (error) {
    console.error(`[${context}] Unexpected error during auth initialization:`, error);
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
      console.error("[Auth] Error checking user:", error);
      return false;
    }
    return !!user;
  } catch (error) {
    console.error("[Auth] Unexpected error checking user:", error);
    return false;
  }
}

