import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getCampaignById } from "@/lib/db/campaigns";
import { getProjectById } from "@/lib/db/projects";
import { switchCampaign } from "@/lib/db/campaigns";
import { checkAndFlushAnonymousAuth } from "@/lib/utils/anonymous-auth-check";

export async function POST(request: NextRequest) {
  try {
    // Check for anonymous users and flush cookies if needed
    const anonymousCheck = await checkAndFlushAnonymousAuth("/auth", true);
    if (anonymousCheck.isAnonymous && anonymousCheck.redirectResponse) {
      return anonymousCheck.redirectResponse;
    }

    const { projectId, targetCampaignId } = await request.json();

    if (!projectId || !targetCampaignId) {
      return NextResponse.json(
        { error: "Project ID and target campaign ID are required" },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const project = await getProjectById(projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (project.is_archived) {
      return NextResponse.json(
        { error: "Cannot switch campaigns in archived projects" },
        { status: 400 }
      );
    }

    const targetCampaign = await getCampaignById(targetCampaignId);
    if (!targetCampaign || targetCampaign.project_id !== projectId) {
      return NextResponse.json(
        { error: "Target campaign not found" },
        { status: 404 }
      );
    }

    if (targetCampaign.campaign_status === "ACTIVE") {
      return NextResponse.json(
        { error: "Target campaign is already active" },
        { status: 400 }
      );
    }

    const result = await switchCampaign(projectId, targetCampaignId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.message || "Failed to switch campaign" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        success: true, 
        message: result.message || "Campaign switched successfully"
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error switching campaign:", error);
    return NextResponse.json(
      { error: error.message || "Failed to switch campaign" },
      { status: 500 }
    );
  }
}

