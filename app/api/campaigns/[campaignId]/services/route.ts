import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import {
  createClientService,
  updateClientService,
  deleteClientService,
  getClientServicesByCampaignId,
} from "@/lib/db/campaigns";
import { getCampaignById } from "@/lib/db/campaigns";
import { getProjectById } from "@/lib/db/projects";

interface RouteParams {
  params: Promise<{ campaignId: string }>;
}

// Batch operations for services
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
          const service = await createClientService(
            campaignId,
            op.data.client_service_name,
            op.data.order_index
          );
          results.push({ type: "create", id: op.tempId, service });
        } else if (op.type === "update") {
          const service = await updateClientService(op.serviceId, op.data);
          results.push({ type: "update", serviceId: op.serviceId, service });
        } else if (op.type === "delete") {
          await deleteClientService(op.serviceId);
          results.push({ type: "delete", serviceId: op.serviceId });
        }
      } catch (error: any) {
        return NextResponse.json(
          { error: `Failed to process operation: ${error.message}` },
          { status: 500 }
        );
      }
    }

    // Reorder remaining services to maintain 1-based indexing
    const remainingServices = await getClientServicesByCampaignId(campaignId);
    for (let i = 0; i < remainingServices.length; i++) {
      if (remainingServices[i].order_index !== i + 1) {
        await updateClientService(remainingServices[i].client_service_id, {
          order_index: i + 1,
        });
      }
    }

    return NextResponse.json({ results }, { status: 200 });
  } catch (error: any) {
    console.error("Error processing service operations:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process service operations" },
      { status: 500 }
    );
  }
}

