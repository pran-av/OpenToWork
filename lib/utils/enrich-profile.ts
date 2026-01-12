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
 */
export async function enrichProfileFromLinkedIn(
  userId: string,
  linkedinData: LinkedInOIDCResponse
): Promise<void> {
  const supabase = await createServerClient();

  // Get current user data
  const { data: currentUser, error: fetchError } = await supabase
    .from("users")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (fetchError || !currentUser) {
    console.error("Error fetching user for profile enrichment:", fetchError);
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
      console.error("Error updating user profile:", updateError);
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
        console.error("Error inserting identity meta:", metaError);
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
      console.error("Error storing provider profile:", providerError);
      // Don't fail the whole operation if provider profile insert fails
    }
  }
}

