import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import {
  getCampaignsByProjectId,
  createCampaign,
  getActiveCampaignByProjectId,
} from "@/lib/db/campaigns";
import { getProjectById } from "@/lib/db/projects";

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { projectId } = await params;
    const supabase = await createServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify project belongs to user
    const project = await getProjectById(projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const campaigns = await getCampaignsByProjectId(projectId);
    const activeCampaign = await getActiveCampaignByProjectId(projectId);

    return NextResponse.json(
      { campaigns, activeCampaign },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    return NextResponse.json(
      { error: "Failed to fetch campaigns" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { projectId } = await params;
    const { campaignName } = await request.json();

    if (!campaignName || typeof campaignName !== "string" || campaignName.trim().length === 0) {
      return NextResponse.json(
        { error: "Campaign name is required" },
        { status: 400 }
      );
    }

    if (campaignName.trim().length > 25) {
      return NextResponse.json(
        { error: "Campaign name must be 25 characters or less" },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify project belongs to user and is not archived
    const project = await getProjectById(projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (project.is_archived) {
      return NextResponse.json(
        { error: "Cannot create campaigns in archived projects" },
        { status: 400 }
      );
    }

    const newCampaign = await createCampaign(projectId, campaignName.trim());
    return NextResponse.json({ campaign: newCampaign }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating campaign:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create campaign" },
      { status: 500 }
    );
  }
}

