import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { updateCampaign, getCampaignById } from "@/lib/db/campaigns";
import { getProjectById } from "@/lib/db/projects";
import { cachedPrivateJsonResponse } from "@/lib/utils/api-cache";

export const runtime = "edge";

interface RouteParams {
  params: Promise<{ campaignId: string }>;
}

export async function GET(
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

    // Verify project belongs to user
    const project = await getProjectById(campaign.project_id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return cachedPrivateJsonResponse({ campaign });
  } catch (error) {
    console.error("Error fetching campaign:", error);
    return NextResponse.json(
      { error: "Failed to fetch campaign" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { campaignId } = await params;
    const updates = await request.json();

    const supabase = await createServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const campaign = await getCampaignById(campaignId);
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Only DRAFT campaigns can be updated
    if (campaign.campaign_status !== "DRAFT") {
      return NextResponse.json(
        { error: "Only draft campaigns can be updated" },
        { status: 400 }
      );
    }

    // Verify project belongs to user and is not archived
    const project = await getProjectById(campaign.project_id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (project.is_archived) {
      return NextResponse.json(
        { error: "Cannot update campaigns in archived projects" },
        { status: 400 }
      );
    }

    // Validate updates
    if (updates.campaign_name && updates.campaign_name.trim().length > 25) {
      return NextResponse.json(
        { error: "Campaign name must be 25 characters or less" },
        { status: 400 }
      );
    }

    if (updates.campaign_structure) {
      if (updates.campaign_structure.client_name && updates.campaign_structure.client_name.length > 25) {
        return NextResponse.json(
          { error: "Client name must be 25 characters or less" },
          { status: 400 }
        );
      }
      if (updates.campaign_structure.client_summary && updates.campaign_structure.client_summary.length > 400) {
        return NextResponse.json(
          { error: "Client summary must be 400 characters or less" },
          { status: 400 }
        );
      }
    }

    const updatedCampaign = await updateCampaign(campaignId, updates);
    return NextResponse.json({ campaign: updatedCampaign }, { status: 200 });
  } catch (error: any) {
    console.error("Error updating campaign:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update campaign" },
      { status: 500 }
    );
  }
}

