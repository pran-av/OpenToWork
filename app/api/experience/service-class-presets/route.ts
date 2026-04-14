import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export interface ServiceClassPresetRow {
  preset: string;
  display_label: string;
}

export async function GET() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase.rpc("list_experience_default_service_class_presets");

    if (error) {
      return NextResponse.json({ error: error.message || "Failed to load presets" }, { status: 500 });
    }

    return NextResponse.json({ presets: (data || []) as ServiceClassPresetRow[] });
  } catch {
    return NextResponse.json({ error: "Failed to load presets" }, { status: 500 });
  }
}
