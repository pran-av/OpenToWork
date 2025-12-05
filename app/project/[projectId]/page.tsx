import { notFound } from "next/navigation";
import CampaignFlowClient from "@/app/campaign/[id]/CampaignFlowClient";
import {
  getActiveCampaignByProjectIdPublic,
  getClientServicesByCampaignIdPublic,
  getCaseStudiesByServiceIdPublic,
} from "@/lib/db/campaigns";
import { getWidgetByCampaignIdPublic } from "@/lib/db/widgets";
import type { CaseStudy } from "@/lib/db/campaigns";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectPage({ params }: PageProps) {
  const { projectId } = await params;
  
  try {
    // Get active campaign for this project (public access - campaigns have public RLS for ACTIVE status)
    const activeCampaign = await getActiveCampaignByProjectIdPublic(projectId);
    
    // If no active campaign, show message
    // This could mean: project doesn't exist, project is archived, or no active campaign
    if (!activeCampaign) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-white">
          <div className="text-center">
            <h1 className="mb-4 text-2xl font-semibold text-zinc-900">
              Campaign Not Available
            </h1>
            <p className="text-zinc-600">
              This project does not have an active campaign available.
            </p>
          </div>
        </div>
      );
    }
    
    // Fetch services for this campaign
    const services = await getClientServicesByCampaignIdPublic(activeCampaign.campaign_id);
    
    // Fetch case studies for all services
    const caseStudiesMap: Record<string, CaseStudy[]> = {};
    for (const service of services) {
      const caseStudies = await getCaseStudiesByServiceIdPublic(service.client_service_id);
      caseStudiesMap[service.client_service_id] = caseStudies;
    }
    
    // Fetch widget for this campaign
    const widget = await getWidgetByCampaignIdPublic(activeCampaign.campaign_id);
    
    // Render the campaign flow directly (same as /campaign/[id])
    return (
      <CampaignFlowClient
        campaign={activeCampaign}
        services={services}
        caseStudiesMap={caseStudiesMap}
        widget={widget}
      />
    );
  } catch (error) {
    console.error("Error in ProjectPage:", error);
    notFound();
  }
}

