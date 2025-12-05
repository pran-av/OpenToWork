import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import {
  createCaseStudy,
  updateCaseStudy,
  deleteCaseStudy,
} from "@/lib/db/campaigns";
import { getCampaignById } from "@/lib/db/campaigns";
import { getProjectById } from "@/lib/db/projects";

interface RouteParams {
  params: Promise<{ campaignId: string }>;
}

// Batch operations for case studies
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { campaignId } = await params;
    const { operations } = await request.json();

    const supabase = await createServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const campaign = await getCampaignById(campaignId);
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    if (campaign.campaign_status !== "DRAFT") {
      return NextResponse.json(
        { error: "Only draft campaigns can be updated" },
        { status: 400 }
      );
    }

    const project = await getProjectById(campaign.project_id);
    if (!project || project.is_archived) {
      return NextResponse.json(
        { error: "Cannot update campaigns in archived projects" },
        { status: 400 }
      );
    }

    const results = [];

    for (const op of operations) {
      try {
        if (op.type === "create") {
          const caseStudy = await createCaseStudy(op.serviceId, op.data);
          results.push({ type: "create", id: op.tempId, caseStudy });
        } else if (op.type === "update") {
          const caseStudy = await updateCaseStudy(op.caseId, op.data);
          results.push({ type: "update", caseId: op.caseId, caseStudy });
        } else if (op.type === "delete") {
          await deleteCaseStudy(op.caseId);
          results.push({ type: "delete", caseId: op.caseId });
        }
      } catch (error: any) {
        return NextResponse.json(
          { error: `Failed to process operation: ${error.message}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ results }, { status: 200 });
  } catch (error: any) {
    console.error("Error processing case study operations:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process case study operations" },
      { status: 500 }
    );
  }
}

