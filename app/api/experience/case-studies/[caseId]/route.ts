import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { updateExperienceCaseStudy } from "@/lib/db/experience";

interface RouteParams {
  params: Promise<{ caseId: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { caseId } = await params;
    const body = await request.json();
    const updates = {
      case_name: body.case_name,
      case_summary: body.case_summary,
      case_duration: body.case_duration,
      display_year: body.display_year,
      case_highlights: body.case_highlights,
      case_study_url: body.case_study_url,
      is_archived: body.is_archived,
    };

    if (updates.case_duration !== undefined && !String(updates.case_duration).trim()) {
      return NextResponse.json({ error: "Case duration is required" }, { status: 400 });
    }
    if (
      updates.display_year !== undefined &&
      (!Number.isInteger(Number(updates.display_year)) ||
        Number(updates.display_year) < 1900 ||
        Number(updates.display_year) > 2099)
    ) {
      return NextResponse.json({ error: "Display year must be between 1900 and 2099" }, { status: 400 });
    }

    const caseStudy = await updateExperienceCaseStudy(caseId, {
      ...updates,
      display_year:
        updates.display_year !== undefined ? Number(updates.display_year) : undefined,
    });
    return NextResponse.json({ caseStudy });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update case study";
    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}
