import { notFound } from "next/navigation";
import CampaignFlowClient from "@/app/campaign/[id]/CampaignFlowClient";
import {
  getActiveCampaignByProjectIdPublic,
  getClientServicesByProjectIdPublic,
  getCaseStudiesByProjectIdPublic,
} from "@/lib/db/campaigns";
import { getWidgetByProjectIdPublic } from "@/lib/db/widgets";
import type { CaseStudy } from "@/lib/db/campaigns";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectPage({ params }: PageProps) {
  const { projectId } = await params;
  
  try {
    // Get active campaign for this project (public access - campaigns have public RLS for ACTIVE status)
    const activeCampaign = await getActiveCampaignByProjectIdPublic(projectId);
    
    // If no active campaign, show end-of-life message (covers archived projects)
    if (!activeCampaign) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-white">
          <div className="text-center">
            <h1 className="mb-4 text-2xl font-semibold text-zinc-900">
              Owner has archieved this campaign
            </h1>
            <p className="text-zinc-600">
              This project is not serving an active campaign at the moment.
            </p>
          </div>
        </div>
      );
    }
    
    // Fetch services for this project (using projectId for security)
    const services = await getClientServicesByProjectIdPublic(projectId);
    
    // Fetch case studies for this project (using projectId for security)
    const allCaseStudies = await getCaseStudiesByProjectIdPublic(projectId);
    
    // Map case studies by service ID for component compatibility
    const caseStudiesMap: Record<string, CaseStudy[]> = {};
    for (const caseStudy of allCaseStudies) {
      if (!caseStudiesMap[caseStudy.client_service_id]) {
        caseStudiesMap[caseStudy.client_service_id] = [];
      }
      caseStudiesMap[caseStudy.client_service_id].push(caseStudy);
    }
    
    // Fetch widget for this project (using projectId for security)
    const widget = await getWidgetByProjectIdPublic(projectId);
    
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

