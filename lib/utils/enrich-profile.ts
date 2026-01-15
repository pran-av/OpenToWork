/**
 * Utility to enrich user profile from LinkedIn OIDC response
 * Only updates fields that are currently empty/null
 */

import { createServerClient } from "@/lib/supabase/server";

interface LinkedInOIDCResponse {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  locale?: {
    country?: string;
    language?: string;
  };
}

/**
 * Enrich user profile from LinkedIn OIDC data
 * Only updates fields that are currently empty/null (doesn't overwrite existing data)
 * 
 * Note: Waits for the handle_new_auth_user() trigger to create the public.users record
 * if it doesn't exist yet (race condition fix for production)
 */
export async function enrichProfileFromLinkedIn(
  userId: string,
  linkedinData: LinkedInOIDCResponse
): Promise<void> {
  const supabase = await createServerClient();

  // Wait for user record to exist (handle race condition with handle_new_auth_user trigger)
  // The trigger runs AFTER INSERT on auth.users, so we may need to retry
  // For low-tier throttling, we need more retries and longer delays
  let currentUser = null;
  let fetchError = null;
  const maxRetries = 15; // Increased for low-tier throttling
  const initialDelay = 500; // Initial delay to give trigger time to start
  const baseRetryDelay = 300; // Base delay between retries

  // Initial delay before first attempt (gives trigger time to start)
  await new Promise(resolve => setTimeout(resolve, initialDelay));

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (data && !error) {
      currentUser = data;
      fetchError = null;
      break;
    }

    fetchError = error;
    
    // If it's not a "not found" error, don't retry
    if (error?.code !== "PGRST116" && error?.message !== "JSON object requested, multiple (or no) rows returned") {
      break;
    }

    // Wait before retrying (exponential backoff with longer intervals for low-tier throttling)
    if (attempt < maxRetries - 1) {
      // Exponential backoff: 300ms, 600ms, 900ms, 1200ms, etc. (capped at 2000ms)
      const delay = Math.min(baseRetryDelay * (attempt + 1), 2000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  if (fetchError || !currentUser) {
    return;
  }

  // Prepare update object - only include fields that are currently null/empty
  const updates: Record<string, any> = {};
  const metaRecords: Array<{ source: string; field: string; confidence: boolean }> = [];

  // Extract data from LinkedIn response
  const linkedinSub = linkedinData.sub;
  const firstName = linkedinData.given_name;
  const lastName = linkedinData.family_name;
  const fullName = linkedinData.name;
  const avatarUrl = linkedinData.picture;
  const country = linkedinData.locale?.country;
  const language = linkedinData.locale?.language;

  // Update fields only if they're currently empty
  if (linkedinSub && !currentUser.linkedin_id) {
    updates.linkedin_id = linkedinSub;
  }

  if (firstName && !currentUser.user_first_name) {
    updates.user_first_name = firstName;
    metaRecords.push({ source: "linkedin_oidc", field: "user_first_name", confidence: true });
  }

  if (lastName && !currentUser.user_last_name) {
    updates.user_last_name = lastName;
    metaRecords.push({ source: "linkedin_oidc", field: "user_last_name", confidence: true });
  }

  // Set display_name from full name or first+last, only if empty
  if (!currentUser.display_name) {
    if (fullName) {
      updates.display_name = fullName;
      metaRecords.push({ source: "linkedin_oidc", field: "display_name", confidence: true });
    } else if (firstName && lastName) {
      updates.display_name = `${firstName} ${lastName}`;
      metaRecords.push({ source: "linkedin_oidc", field: "display_name", confidence: true });
    }
  }

  if (avatarUrl && !currentUser.avatar_url) {
    updates.avatar_url = avatarUrl;
    metaRecords.push({ source: "linkedin_oidc", field: "avatar_url", confidence: true });
  }

  if (country && !currentUser.country) {
    updates.country = country;
    metaRecords.push({ source: "linkedin_oidc", field: "country", confidence: true });
  }

  if (language && !currentUser.language) {
    updates.language = language;
    metaRecords.push({ source: "linkedin_oidc", field: "language", confidence: true });
  }

  // Update profile_last_updated timestamp
  updates.profile_last_updated = new Date().toISOString();

  // Check if profile is now completed (has name and avatar or name)
  const hasName = updates.display_name || (updates.user_first_name && updates.user_last_name) || currentUser.display_name || (currentUser.user_first_name && currentUser.user_last_name);
  const hasAvatar = updates.avatar_url || currentUser.avatar_url;
  
  if (hasName && !currentUser.profile_completed) {
    updates.profile_completed = true;
  }

  // Update user record if there are changes
  if (Object.keys(updates).length > 0) {
    const { error: updateError } = await supabase
      .from("users")
      .update(updates)
      .eq("user_id", userId);

    if (updateError) {
      return;
    }

    // Insert meta records for tracking
    if (metaRecords.length > 0) {
      const metaInserts = metaRecords.map((meta) => ({
        user_id: userId,
        ...meta,
      }));

      const { error: metaError } = await supabase
        .from("user_identity_meta")
        .insert(metaInserts);

      if (metaError) {
        // Don't fail the whole operation if meta insert fails
      }
    }
  }

  // Store provider profile data
  if (linkedinSub) {
    const { error: providerError } = await supabase
      .from("provider_profiles")
      .upsert({
        user_id: userId,
        provider: "linkedin_oidc",
        provider_sub: linkedinSub,
        provider_data: linkedinData,
      }, {
        onConflict: "provider,provider_sub",
      });

    if (providerError) {
      // Don't fail the whole operation if provider profile insert fails
    }
  }
}

