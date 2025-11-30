import { notFound } from "next/navigation";
import CampaignFlowClient from "./CampaignFlowClient";
import {
  getCampaignById,
  getClientServicesByCampaignId,
  getCaseStudiesByServiceId,
} from "@/lib/db/campaigns";
import { getWidgetByCampaignId } from "@/lib/db/widgets";
import type { CaseStudy } from "@/lib/db/campaigns";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CampaignPage({ params }: PageProps) {
  const { id: campaignId } = await params;

  // Fetch campaign data
  const campaign = await getCampaignById(campaignId);

  if (!campaign) {
    notFound();
  }

  // Fetch services for this campaign
  const services = await getClientServicesByCampaignId(campaignId);

  // Fetch case studies for all services
  const caseStudiesMap: Record<string, CaseStudy[]> = {};
  for (const service of services) {
    const caseStudies = await getCaseStudiesByServiceId(service.client_service_id);
    caseStudiesMap[service.client_service_id] = caseStudies;
  }

  // Fetch widget for this campaign
  const widget = await getWidgetByCampaignId(campaignId);

  return (
    <CampaignFlowClient
      campaign={campaign}
      services={services}
      caseStudiesMap={caseStudiesMap}
      widget={widget}
    />
  );
}

