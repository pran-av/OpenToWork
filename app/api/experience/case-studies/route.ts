import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import {
  createExperienceCaseStudy,
  getExperienceCaseStudiesForUser,
} from "@/lib/db/experience";

export async function GET() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const caseStudies = await getExperienceCaseStudiesForUser();
    return NextResponse.json({ caseStudies });
  } catch {
    return NextResponse.json(
      { error: "Failed to load case studies" },
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

    const body = await request.json();
    const {
      service_class_id,
      case_name,
      case_summary,
      case_duration,
      display_year,
      case_highlights,
      case_study_url,
    } = body;

    if (!service_class_id || typeof service_class_id !== "string") {
      return NextResponse.json({ error: "Service class is required" }, { status: 400 });
    }
    if (!case_name || typeof case_name !== "string" || !case_name.trim()) {
      return NextResponse.json({ error: "Case name is required" }, { status: 400 });
    }
    if (case_duration !== undefined && case_duration !== null && typeof case_duration !== "string") {
      return NextResponse.json({ error: "Case duration must be a string when provided" }, { status: 400 });
    }
    const summaryStr =
      case_summary === undefined || case_summary === null ? "" : String(case_summary).trim();
    if (summaryStr.length > 700) {
      return NextResponse.json({ error: "Case summary must be at most 700 characters" }, { status: 400 });
    }
    if (
      display_year === undefined ||
      !Number.isInteger(Number(display_year)) ||
      Number(display_year) < 1900 ||
      Number(display_year) > 2099
    ) {
      return NextResponse.json({ error: "Display year must be between 1900 and 2099" }, { status: 400 });
    }
    if (!case_highlights || typeof case_highlights !== "string" || !case_highlights.trim()) {
      return NextResponse.json({ error: "At least one case highlight is required" }, { status: 400 });
    }

    const durationStr =
      case_duration === undefined || case_duration === null ? "" : String(case_duration).trim();

    const caseStudy = await createExperienceCaseStudy({
      service_class_id,
      case_name,
      case_summary: summaryStr || undefined,
      case_duration: durationStr.length > 0 ? durationStr : null,
      display_year: Number(display_year),
      case_highlights,
      case_study_url,
    });

    return NextResponse.json({ caseStudy }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create case study";
    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}
