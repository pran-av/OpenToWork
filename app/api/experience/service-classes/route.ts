import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createServiceClass, getServiceClasses } from "@/lib/db/experience";

export async function GET() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceClasses = await getServiceClasses();
    return NextResponse.json({ serviceClasses });
  } catch {
    return NextResponse.json(
      { error: "Failed to load service classes" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { serviceClassName } = await request.json();
    if (!serviceClassName || typeof serviceClassName !== "string" || !serviceClassName.trim()) {
      return NextResponse.json({ error: "Service class name is required" }, { status: 400 });
    }

    const serviceClass = await createServiceClass(serviceClassName);
    return NextResponse.json({ serviceClass }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create service class";
    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}
