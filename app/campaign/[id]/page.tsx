import { notFound } from "next/navigation";
import CampaignFlowClient from "./CampaignFlowClient";
import {
  getCampaignById,
  getClientServicesByCampaignId,
  getCaseStudiesByServiceId,
} from "@/lib/db/campaigns";
import { getAttachedExperienceCaseStudiesForCampaign } from "@/lib/db/experience";
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

  const serviceIdByName = new Map(
    services.map((service) => [service.client_service_name.trim().toLowerCase(), service.client_service_id])
  );
  const attachedExperienceCaseStudies = await getAttachedExperienceCaseStudiesForCampaign(campaignId);
  for (const attachedCaseStudy of attachedExperienceCaseStudies) {
    const mappedServiceId = serviceIdByName.get(attachedCaseStudy.service_class_name.trim().toLowerCase());
    if (!mappedServiceId) continue;

    const adaptedCaseStudy: CaseStudy = {
      case_id: attachedCaseStudy.case_id,
      client_service_id: mappedServiceId,
      case_name: attachedCaseStudy.case_name,
      case_summary: attachedCaseStudy.case_summary || "",
      case_duration: attachedCaseStudy.case_duration,
      case_highlights: attachedCaseStudy.case_highlights,
      case_study_url: attachedCaseStudy.case_study_url || "",
      created_at: attachedCaseStudy.created_at,
    };

    const current = caseStudiesMap[mappedServiceId] || [];
    if (!current.some((entry) => entry.case_id === adaptedCaseStudy.case_id)) {
      caseStudiesMap[mappedServiceId] = [...current, adaptedCaseStudy];
    }
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

