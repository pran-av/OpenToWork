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

    if (updates.case_duration !== undefined && updates.case_duration !== null && typeof updates.case_duration !== "string") {
      return NextResponse.json({ error: "Case duration must be a string when provided" }, { status: 400 });
    }
    if (updates.case_summary !== undefined && updates.case_summary !== null) {
      const s = String(updates.case_summary).trim();
      if (s.length > 700) {
        return NextResponse.json({ error: "Case summary must be at most 700 characters" }, { status: 400 });
      }
    }
    if (
      updates.display_year !== undefined &&
      (!Number.isInteger(Number(updates.display_year)) ||
        Number(updates.display_year) < 1900 ||
        Number(updates.display_year) > 2099)
    ) {
      return NextResponse.json({ error: "Display year must be between 1900 and 2099" }, { status: 400 });
    }

    const patch: {
      case_name?: string;
      case_summary?: string;
      case_duration?: string;
      display_year?: number;
      case_highlights?: string;
      case_study_url?: string;
      is_archived?: boolean;
    } = {};
    if (updates.case_name !== undefined) patch.case_name = updates.case_name;
    if (updates.case_summary !== undefined) patch.case_summary = updates.case_summary;
    if (updates.case_duration !== undefined) patch.case_duration = updates.case_duration;
    if (updates.case_highlights !== undefined) patch.case_highlights = updates.case_highlights;
    if (updates.case_study_url !== undefined) patch.case_study_url = updates.case_study_url;
    if (updates.is_archived !== undefined) patch.is_archived = updates.is_archived;
    if (updates.display_year !== undefined) {
      patch.display_year = Number(updates.display_year);
    }

    const caseStudy = await updateExperienceCaseStudy(caseId, patch);
    return NextResponse.json({ caseStudy });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update case study";
    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}
