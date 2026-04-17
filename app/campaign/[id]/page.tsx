import { notFound } from "next/navigation";
import CampaignFlowClient from "./CampaignFlowClient";
import {
  getCampaignById,
} from "@/lib/db/campaigns";
import { getAttachedExperienceCaseStudiesForCampaign } from "@/lib/db/experience";
import { getWidgetByCampaignId } from "@/lib/db/widgets";
import type { CaseStudy, ClientService } from "@/lib/db/campaigns";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CampaignPage({ params }: PageProps) {
  const { id: campaignId } = await params;

  const toTitleCase = (value: string) =>
    value
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

  // Fetch campaign data
  const campaign = await getCampaignById(campaignId);

  if (!campaign) {
    notFound();
  }

  // Build services and case studies only from attached internal experience case studies.
  const servicesMap = new Map<string, ClientService>();
  const caseStudiesMap: Record<string, CaseStudy[]> = {};
  const attachedExperienceCaseStudies = await getAttachedExperienceCaseStudiesForCampaign(campaignId);

  const getServiceKey = (attachedServiceClassId: string | null, serviceClassName: string) => {
    if (attachedServiceClassId && attachedServiceClassId.trim()) {
      return attachedServiceClassId;
    }
    return `name:${serviceClassName.trim().toLowerCase()}`;
  };

  for (const attachedCaseStudy of attachedExperienceCaseStudies) {
    const mappedServiceId = getServiceKey(
      attachedCaseStudy.attached_service_class_id,
      attachedCaseStudy.service_class_name
    );
    if (!servicesMap.has(mappedServiceId)) {
      servicesMap.set(mappedServiceId, {
        client_service_id: mappedServiceId,
        campaign_id: campaignId,
        client_service_name: toTitleCase(attachedCaseStudy.service_class_name),
        order_index: servicesMap.size,
      });
    }

    const adaptedCaseStudy: CaseStudy = {
      case_id: attachedCaseStudy.case_id,
      client_service_id: mappedServiceId,
      case_name: attachedCaseStudy.case_name,
      case_summary: attachedCaseStudy.case_summary || "",
      case_duration: attachedCaseStudy.case_duration ?? "",
      case_highlights: attachedCaseStudy.case_highlights,
      case_study_url: attachedCaseStudy.case_study_url || "",
      created_at: attachedCaseStudy.created_at,
    };

    const current = caseStudiesMap[mappedServiceId] || [];
    if (!current.some((entry) => entry.case_id === adaptedCaseStudy.case_id)) {
      caseStudiesMap[mappedServiceId] = [...current, adaptedCaseStudy];
    }
  }
  const services = Array.from(servicesMap.values());

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

