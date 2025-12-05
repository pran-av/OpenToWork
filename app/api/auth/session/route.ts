import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Error checking session:", error);
    return NextResponse.json({ user: null }, { status: 200 });
  }
}


