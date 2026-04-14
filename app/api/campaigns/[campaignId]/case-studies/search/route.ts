import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getCampaignById } from "@/lib/db/campaigns";
import { getProjectById } from "@/lib/db/projects";
import { searchExperienceCaseStudiesByTitle } from "@/lib/db/experience";

interface RouteParams {
  params: Promise<{ campaignId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { campaignId } = await params;
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const campaign = await getCampaignById(campaignId);
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }
    const project = await getProjectById(campaign.project_id);
    if (!project || project.is_archived) {
      return NextResponse.json({ error: "Project not available" }, { status: 400 });
    }

    const query = request.nextUrl.searchParams.get("q") || "";
    const caseStudies = await searchExperienceCaseStudiesByTitle(query, 20);
    return NextResponse.json({ caseStudies });
  } catch {
    return NextResponse.json(
      { error: "Failed to search case studies" },
      { status: 500 }
    );
  }
}
