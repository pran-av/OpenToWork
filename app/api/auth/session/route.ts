import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { noStoreJsonResponse } from "@/lib/utils/api-cache";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    return noStoreJsonResponse({ user });
  } catch (error) {
    console.error("Error checking session:", error);
    return noStoreJsonResponse({ user: null });
  }
}


