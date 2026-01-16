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
 * 
 * @param userId - The user ID from auth.users
 * @param linkedinData - LinkedIn OIDC response data
 * @param supabaseClient - Optional Supabase client instance (if provided, uses this instead of creating new one)
 */
export async function enrichProfileFromLinkedIn(
  userId: string,
  linkedinData: LinkedInOIDCResponse,
  supabaseClient?: Awaited<ReturnType<typeof createServerClient>>
): Promise<void> {
  const isDev = process.env.NODE_ENV !== "production" && process.env.ENVIRONMENT !== "production";
  
  if (isDev) {
    console.log("[enrichProfileFromLinkedIn] Starting profile enrichment", {
      userId,
      hasLinkedInSub: !!linkedinData.sub,
      hasName: !!linkedinData.name,
      hasGivenName: !!linkedinData.given_name,
      hasFamilyName: !!linkedinData.family_name,
      hasPicture: !!linkedinData.picture,
      usingProvidedClient: !!supabaseClient,
    });
  }

  const supabase = supabaseClient || await createServerClient();

  // Wait for user record to exist (handle race condition with handle_new_auth_user trigger)
  // The trigger runs AFTER INSERT on auth.users, so we may need to retry
  // For low-tier throttling, we need more retries and longer delays
  let currentUser = null;
  let fetchError = null;
  const maxRetries = 15; // Increased for low-tier throttling
  const initialDelay = 500; // Initial delay to give trigger time to start
  const baseRetryDelay = 300; // Base delay between retries

  // Initial delay before first attempt (gives trigger time to start)
  if (isDev) {
    console.log("[enrichProfileFromLinkedIn] Waiting initial delay", { initialDelay: `${initialDelay}ms` });
  }
  await new Promise(resolve => setTimeout(resolve, initialDelay));

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (isDev) {
      console.log(`[enrichProfileFromLinkedIn] Fetching user record - attempt ${attempt + 1}/${maxRetries}`, {
        userId,
      });
    }

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (data && !error) {
      currentUser = data;
      fetchError = null;
      if (isDev) {
        console.log("[enrichProfileFromLinkedIn] User record found", {
          userId,
          attempt: attempt + 1,
          hasFirstName: !!currentUser.user_first_name,
          hasLastName: !!currentUser.user_last_name,
          hasDisplayName: !!currentUser.display_name,
          hasAvatar: !!currentUser.avatar_url,
          profileCompleted: currentUser.profile_completed,
        });
      }
      break;
    }

    fetchError = error;
    
    if (isDev) {
      console.log(`[enrichProfileFromLinkedIn] User record not found - attempt ${attempt + 1}/${maxRetries}`, {
        userId,
        errorCode: error?.code,
        errorMessage: error?.message,
      });
    }
    
    // If it's not a "not found" error, don't retry
    if (error?.code !== "PGRST116" && error?.message !== "JSON object requested, multiple (or no) rows returned") {
      if (isDev) {
        console.log("[enrichProfileFromLinkedIn] Non-retryable error, stopping", {
          errorCode: error?.code,
          errorMessage: error?.message,
        });
      }
      break;
    }

    // Wait before retrying (exponential backoff with longer intervals for low-tier throttling)
    if (attempt < maxRetries - 1) {
      // Exponential backoff: 300ms, 600ms, 900ms, 1200ms, etc. (capped at 2000ms)
      const delay = Math.min(baseRetryDelay * (attempt + 1), 2000);
      if (isDev) {
        console.log(`[enrichProfileFromLinkedIn] Waiting before retry`, { delay: `${delay}ms` });
      }
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  if (fetchError || !currentUser) {
    if (isDev) {
      console.error("[enrichProfileFromLinkedIn] Failed to fetch user record after all retries", {
        userId,
        fetchError: fetchError?.message || "Unknown error",
        errorCode: fetchError?.code,
      });
    }
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

  if (isDev) {
    console.log("[enrichProfileFromLinkedIn] Prepared updates", {
      userId,
      updateFields: Object.keys(updates),
      updates,
      metaRecordsCount: metaRecords.length,
      hasName,
      hasAvatar,
      willMarkCompleted: hasName && !currentUser.profile_completed,
    });
  }

  // Update user record if there are changes
  if (Object.keys(updates).length > 0) {
    // Verify session is available for RLS before attempting update
    // This is critical: RLS policies use auth.uid() which requires the JWT to be in the request
    if (isDev) {
      console.log("[enrichProfileFromLinkedIn] Verifying session for RLS", { userId });
    }
    const { data: { session: verifySession }, error: sessionError } = await supabase.auth.getSession();
    if (!verifySession || sessionError) {
      if (isDev) {
        console.error("[enrichProfileFromLinkedIn] Session not available for RLS", {
          userId,
          sessionError: sessionError?.message,
        });
      }
      // Session not available - RLS would fail silently (returns 0 rows, not an error)
      // This can happen if the client doesn't have the session established yet
      // Using the same client from exchangeCodeForSession should prevent this
      return;
    }

    // Verify the session user ID matches (safety check)
    if (verifySession.user?.id !== userId) {
      if (isDev) {
        console.error("[enrichProfileFromLinkedIn] Session user ID mismatch", {
          expectedUserId: userId,
          sessionUserId: verifySession.user?.id,
        });
      }
      // Session user ID mismatch - this shouldn't happen
      return;
    }

    if (isDev) {
      console.log("[enrichProfileFromLinkedIn] Session verified, proceeding with update", {
        userId,
        sessionUserId: verifySession.user?.id,
      });
    }

    if (isDev) {
      console.log("[enrichProfileFromLinkedIn] Updating user record", {
        userId,
        updateFields: Object.keys(updates),
      });
    }

    const { data: updateData, error: updateError } = await supabase
      .from("users")
      .update(updates)
      .eq("user_id", userId)
      .select(); // Select to verify rows were updated

    if (updateError) {
      if (isDev) {
        console.error("[enrichProfileFromLinkedIn] Update failed", {
          userId,
          error: updateError.message,
          errorCode: updateError.code,
        });
      }
      return;
    }

    // Check if any rows were actually updated (RLS might block silently)
    if (!updateData || updateData.length === 0) {
      if (isDev) {
        console.error("[enrichProfileFromLinkedIn] No rows updated - likely RLS blocked", {
          userId,
          updateFields: Object.keys(updates),
        });
      }
      // No rows updated - likely RLS policy blocked the update
      // This can happen if auth.uid() is not available in the database context
      return;
    }

    if (isDev) {
      console.log("[enrichProfileFromLinkedIn] User record updated successfully", {
        userId,
        updatedFields: Object.keys(updates),
        rowsUpdated: updateData.length,
      });
    }

    // Insert meta records for tracking
    if (metaRecords.length > 0) {
      if (isDev) {
        console.log("[enrichProfileFromLinkedIn] Inserting meta records", {
          userId,
          metaRecordsCount: metaRecords.length,
          metaRecords,
        });
      }

      const metaInserts = metaRecords.map((meta) => ({
        user_id: userId,
        ...meta,
      }));

      const { error: metaError } = await supabase
        .from("user_identity_meta")
        .insert(metaInserts);

      if (metaError) {
        if (isDev) {
          console.error("[enrichProfileFromLinkedIn] Meta records insert failed", {
            userId,
            error: metaError.message,
            errorCode: metaError.code,
          });
        }
        // Don't fail the whole operation if meta insert fails
      } else if (isDev) {
        console.log("[enrichProfileFromLinkedIn] Meta records inserted successfully", {
          userId,
          recordsInserted: metaRecords.length,
        });
      }
    }
  } else if (isDev) {
    console.log("[enrichProfileFromLinkedIn] No updates needed - all fields already populated", {
      userId,
    });
  }

  // Store provider profile data
  if (linkedinSub) {
    if (isDev) {
      console.log("[enrichProfileFromLinkedIn] Upserting provider profile", {
        userId,
        provider: "linkedin_oidc",
        providerSub: linkedinSub,
      });
    }

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
      if (isDev) {
        console.error("[enrichProfileFromLinkedIn] Provider profile upsert failed", {
          userId,
          provider: "linkedin_oidc",
          providerSub: linkedinSub,
          error: providerError.message,
          errorCode: providerError.code,
        });
      }
      // Don't fail the whole operation if provider profile insert fails
    } else if (isDev) {
      console.log("[enrichProfileFromLinkedIn] Provider profile upserted successfully", {
        userId,
        provider: "linkedin_oidc",
        providerSub: linkedinSub,
      });
    }
  } else if (isDev) {
    console.log("[enrichProfileFromLinkedIn] Skipping provider profile upsert - no LinkedIn sub", {
      userId,
    });
  }

  if (isDev) {
    console.log("[enrichProfileFromLinkedIn] Profile enrichment completed", {
      userId,
    });
  }
}

