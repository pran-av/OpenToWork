import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getCampaignById } from "@/lib/db/campaigns";
import { getProjectById } from "@/lib/db/projects";
import { publishCampaign } from "@/lib/db/campaigns";

interface RouteParams {
  params: Promise<{ campaignId: string }>;
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { campaignId } = await params;
    const supabase = await createServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const campaign = await getCampaignById(campaignId);
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const project = await getProjectById(campaign.project_id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (project.is_archived) {
      return NextResponse.json(
        { error: "Cannot publish campaigns in archived projects" },
        { status: 400 }
      );
    }

    if (campaign.campaign_status !== "DRAFT") {
      return NextResponse.json(
        { error: "Only draft campaigns can be published" },
        { status: 400 }
      );
    }

    const result = await publishCampaign(campaign.project_id, campaignId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.message || "Failed to publish campaign" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        success: true, 
        message: result.message || "Campaign published successfully",
        project_url: result.project_url 
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error publishing campaign:", error);
    return NextResponse.json(
      { error: error.message || "Failed to publish campaign" },
      { status: 500 }
    );
  }
}

