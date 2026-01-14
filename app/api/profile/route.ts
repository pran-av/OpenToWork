import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { noStoreJsonResponse } from "@/lib/utils/api-cache";

/**
 * GET: Fetch current user's profile
 * PUT: Update current user's profile (first_name, last_name, display_name)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return noStoreJsonResponse(
        { error: "Authentication required" },
        401
      );
    }

    // Fetch user profile from public.users
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("user_first_name, user_last_name, display_name, avatar_url, linkedin_id, profile_completed")
      .eq("user_id", user.id)
      .single();

    if (profileError) {
      console.error("Error fetching user profile:", profileError);
      return noStoreJsonResponse(
        { error: "Failed to fetch profile" },
        500
      );
    }

    return noStoreJsonResponse({ profile });
  } catch (error) {
    console.error("Error in profile GET:", error);
    return noStoreJsonResponse(
      { error: "Failed to fetch profile" },
      500
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return noStoreJsonResponse(
        { error: "Authentication required" },
        401
      );
    }

    const body = await request.json();
    const { first_name, last_name } = body;

    // Sanitize inputs
    const sanitizeInput = (input: string): string => {
      return input
        .trim()
        .replace(/[<>]/g, "") // Remove angle brackets
        .replace(/javascript:/gi, "") // Remove javascript: protocol
        .replace(/on\w+=/gi, ""); // Remove event handlers
    };

    // Prepare updates
    const updates: Record<string, any> = {};
    const metaRecords: Array<{ source: string; field: string; confidence: boolean }> = [];

    // Update first_name if provided
    if (first_name !== undefined) {
      const sanitizedFirstName = sanitizeInput(first_name);
      if (sanitizedFirstName) {
        updates.user_first_name = sanitizedFirstName;
        metaRecords.push({ source: "manual", field: "user_first_name", confidence: true });
      } else {
        updates.user_first_name = null; // Allow clearing the field
      }
    }

    // Update last_name if provided
    if (last_name !== undefined) {
      const sanitizedLastName = sanitizeInput(last_name);
      if (sanitizedLastName) {
        updates.user_last_name = sanitizedLastName;
        metaRecords.push({ source: "manual", field: "user_last_name", confidence: true });
      } else {
        updates.user_last_name = null; // Allow clearing the field
      }
    }

    // Get current profile to calculate display_name and profile_completed
    const { data: currentProfile } = await supabase
      .from("users")
      .select("user_first_name, user_last_name, display_name, avatar_url, profile_completed")
      .eq("user_id", user.id)
      .single();

    if (!currentProfile) {
      return noStoreJsonResponse(
        { error: "User profile not found" },
        404
      );
    }

    // Set display_name from first_name + last_name
    if (first_name !== undefined || last_name !== undefined) {
      const finalFirstName = updates.user_first_name !== undefined 
        ? updates.user_first_name 
        : currentProfile.user_first_name;
      const finalLastName = updates.user_last_name !== undefined 
        ? updates.user_last_name 
        : currentProfile.user_last_name;

      if (finalFirstName || finalLastName) {
        updates.display_name = [finalFirstName, finalLastName].filter(Boolean).join(" ").trim();
        metaRecords.push({ source: "manual", field: "display_name", confidence: true });
      } else {
        updates.display_name = null;
      }
    }

    // Update profile_last_updated timestamp
    updates.profile_last_updated = new Date().toISOString();

    // Check if profile is completed
    const finalFirstName = updates.user_first_name !== undefined ? updates.user_first_name : currentProfile.user_first_name;
    const finalLastName = updates.user_last_name !== undefined ? updates.user_last_name : currentProfile.user_last_name;
    const finalDisplayName = updates.display_name !== undefined ? updates.display_name : currentProfile.display_name;
    const hasAvatar = currentProfile.avatar_url;

    const hasName = finalDisplayName || (finalFirstName && finalLastName);
    if (hasName && !currentProfile?.profile_completed) {
      updates.profile_completed = true;
    }

    // Update user record
    const { data: updatedProfile, error: updateError } = await supabase
      .from("users")
      .update(updates)
      .eq("user_id", user.id)
      .select("user_first_name, user_last_name, display_name, avatar_url, profile_completed")
      .single();

    if (updateError) {
      console.error("Error updating user profile:", updateError);
      return noStoreJsonResponse(
        { error: "Failed to update profile" },
        500
      );
    }

    // Insert meta records for tracking
    if (metaRecords.length > 0) {
      const metaInserts = metaRecords.map((meta) => ({
        user_id: user.id,
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

    return noStoreJsonResponse({ profile: updatedProfile });
  } catch (error) {
    console.error("Error in profile PUT:", error);
    return noStoreJsonResponse(
      { error: "Failed to update profile" },
      500
    );
  }
}

