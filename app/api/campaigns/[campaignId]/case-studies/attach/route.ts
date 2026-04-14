import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getCampaignById } from "@/lib/db/campaigns";
import { getProjectById } from "@/lib/db/projects";
import { attachExperienceCaseStudyToCampaign } from "@/lib/db/experience";

interface RouteParams {
  params: Promise<{ campaignId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
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
    if (campaign.campaign_status !== "DRAFT") {
      return NextResponse.json({ error: "Only draft campaigns can be updated" }, { status: 400 });
    }

    const project = await getProjectById(campaign.project_id);
    if (!project || project.is_archived) {
      return NextResponse.json({ error: "Project not available" }, { status: 400 });
    }

    const { caseId, attachedServiceClassId, orderIndex } = await request.json();
    if (!caseId || typeof caseId !== "string") {
      return NextResponse.json({ error: "caseId is required" }, { status: 400 });
    }

    await attachExperienceCaseStudyToCampaign({
      campaign_id: campaignId,
      case_id: caseId,
      attached_service_class_id: attachedServiceClassId,
      order_index: typeof orderIndex === "number" ? orderIndex : 0,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to attach case study";
    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}
