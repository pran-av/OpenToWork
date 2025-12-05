import { notFound } from "next/navigation";
import { getCampaignById } from "@/lib/db/campaigns";
import { getProjectById } from "@/lib/db/projects";
import { getActiveCampaignByProjectId } from "@/lib/db/campaigns";
import { getClientServicesByCampaignId } from "@/lib/db/campaigns";
import { getCaseStudiesByServiceId } from "@/lib/db/campaigns";
import { isCampaignPublishable } from "@/lib/db/campaigns";
import CampaignOverviewClient from "./CampaignOverviewClient";

interface PageProps {
  params: Promise<{ projectId: string; campaignId: string }>;
}

export default async function CampaignOverviewPage({ params }: PageProps) {
  const { projectId, campaignId } = await params;
  
  const campaign = await getCampaignById(campaignId);
  if (!campaign || campaign.project_id !== projectId) {
    notFound();
  }

  const project = await getProjectById(projectId);
  if (!project) {
    notFound();
  }

  // Get active campaign to determine which CTA to show
  const activeCampaign = await getActiveCampaignByProjectId(projectId);
  const hasActiveCampaign = activeCampaign !== null && activeCampaign.campaign_id !== campaignId;

  // Get client services and case studies
  const clientServices = await getClientServicesByCampaignId(campaignId);
  const servicesWithCaseStudies = await Promise.all(
    clientServices.map(async (service) => {
      const caseStudies = await getCaseStudiesByServiceId(service.client_service_id);
      return { ...service, caseStudies };
    })
  );

  // Check if campaign is publishable (for DRAFT campaigns)
  const isPublishable = campaign.campaign_status === "DRAFT" 
    ? await isCampaignPublishable(campaignId)
    : false;

  return (
    <CampaignOverviewClient
      campaign={campaign}
      project={project}
      servicesWithCaseStudies={servicesWithCaseStudies}
      hasActiveCampaign={hasActiveCampaign}
      isPublishable={isPublishable}
    />
  );
}

