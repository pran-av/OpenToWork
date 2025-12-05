"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { CampaignData, ClientService, CaseStudy } from "@/lib/db/campaigns";
import type { ProjectData } from "@/lib/db/projects";
import { Accordion } from "@/components/ui/accordion";

interface ServiceWithCaseStudies extends ClientService {
  caseStudies: CaseStudy[];
}

interface CampaignOverviewClientProps {
  campaign: CampaignData;
  project: ProjectData;
  servicesWithCaseStudies: ServiceWithCaseStudies[];
  hasActiveCampaign: boolean;
  isPublishable: boolean;
}

export default function CampaignOverviewClient({
  campaign: initialCampaign,
  project,
  servicesWithCaseStudies: initialServices,
  hasActiveCampaign,
  isPublishable: initialIsPublishable,
}: CampaignOverviewClientProps) {
  const router = useRouter();
  const isDraft = initialCampaign.campaign_status === "DRAFT";
  const isEditMode = isDraft;

  const [campaign, setCampaign] = useState(initialCampaign);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPublishable, setIsPublishable] = useState(initialIsPublishable);

  // Form state for draft campaigns
  const [campaignName, setCampaignName] = useState(campaign.campaign_name);
  const [clientName, setClientName] = useState(campaign.campaign_structure.client_name || "");
  const [clientSummary, setClientSummary] = useState(campaign.campaign_structure.client_summary || "");
  const [ctaScheduleMeeting, setCtaScheduleMeeting] = useState(campaign.cta_config.schedule_meeting || "");
  const [ctaMailto, setCtaMailto] = useState(campaign.cta_config.mailto || "");
  const [ctaLinkedin, setCtaLinkedin] = useState(campaign.cta_config.linkedin || "");
  const [ctaPhone, setCtaPhone] = useState(campaign.cta_config.phone || "");

  const [showMoreSummary, setShowMoreSummary] = useState(false);

  // Check if any mandatory fields are empty
  const hasEmptyMandatoryFields = 
    !clientName.trim() ||
    !clientSummary.trim() ||
    (!ctaScheduleMeeting?.trim() && !ctaMailto?.trim() && !ctaLinkedin?.trim() && !ctaPhone?.trim()) ||
    initialServices.length === 0 ||
    initialServices.some(service => service.caseStudies.length === 0);

  useEffect(() => {
    setIsPublishable(!hasEmptyMandatoryFields);
  }, [hasEmptyMandatoryFields]);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const updates = {
        campaign_name: campaignName.trim(),
        campaign_structure: {
          client_name: clientName.trim(),
          client_summary: clientSummary.trim(),
        },
        cta_config: {
          ...(ctaScheduleMeeting.trim() && { schedule_meeting: ctaScheduleMeeting.trim() }),
          ...(ctaMailto.trim() && { mailto: ctaMailto.trim() }),
          ...(ctaLinkedin.trim() && { linkedin: ctaLinkedin.trim() }),
          ...(ctaPhone.trim() && { phone: ctaPhone.trim() }),
        },
      };

      const res = await fetch(`/api/campaigns/${campaign.campaign_id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to save campaign");
        setIsSaving(false);
        return;
      }

      setCampaign(data.campaign);
      setSuccess("Campaign saved successfully");
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      setError("An unexpected error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!isPublishable) return;

    setIsPublishing(true);
    setError(null);

    // Publish/Switch functionality will be implemented in P4
    // For now, just show a message
    alert("Publish/Switch functionality will be implemented in P4");
    setIsPublishing(false);
  };

  const handleSwitchCampaign = () => {
    // Switch functionality will be implemented in P4
    alert("Switch Campaign functionality will be implemented in P4");
  };

  const getStatusBadgeColor = () => {
    switch (campaign.campaign_status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "DRAFT":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "PAUSED":
        return "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400";
      default:
        return "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400";
    }
  };

  const getPrimaryCTALabel = () => {
    if (campaign.campaign_status === "ACTIVE") {
      return "Switch Campaign";
    }
    if (campaign.campaign_status === "DRAFT") {
      return hasActiveCampaign ? "Switch to Current" : "Publish";
    }
    return "Switch Campaign";
  };

  const shouldShowPrimaryCTA = () => {
    if (campaign.campaign_status === "ACTIVE") {
      // Only show if there are other campaigns (will be checked in P4)
      return true;
    }
    if (campaign.campaign_status === "DRAFT") {
      return true; // Always show, but disabled if not publishable
    }
    return true; // PAUSED
  };

  // For view mode: show first 4 lines, then "See more" if longer
  const currentSummary = isEditMode ? clientSummary : (campaign.campaign_structure.client_summary || "");
  const summaryLines = currentSummary.split("\n");
  const shouldShowMore = summaryLines.length > 4;
  const displaySummary = showMoreSummary || !shouldShowMore 
    ? currentSummary 
    : summaryLines.slice(0, 4).join("\n");

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {isEditMode ? (
              <input
                type="text"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                maxLength={25}
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-2xl font-semibold text-black placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-zinc-600 dark:focus:ring-zinc-600"
                placeholder="Campaign Name"
              />
            ) : (
              <h2 className="text-2xl font-semibold text-black dark:text-zinc-50">
                {campaign.campaign_name}
              </h2>
            )}
            <div className="mt-2 flex items-center gap-4">
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusBadgeColor()}`}>
                {campaign.campaign_status}
              </span>
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                Created {new Date(campaign.created_at).toLocaleDateString()}
              </span>
              {project.project_url && campaign.campaign_status === "ACTIVE" && (
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  {project.project_url}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {shouldShowPrimaryCTA() && (
              <button
                onClick={campaign.campaign_status === "ACTIVE" ? handleSwitchCampaign : handlePublish}
                disabled={
                  (campaign.campaign_status === "DRAFT" && !isPublishable) ||
                  isPublishing ||
                  project.is_archived
                }
                className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
              >
                {isPublishing ? "Processing..." : getPrimaryCTALabel()}
              </button>
            )}
            {isEditMode && (
              <button
                onClick={handleSave}
                disabled={isSaving || project.is_archived}
                className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
            )}
          </div>
        </div>
        {error && (
          <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}
        {success && (
          <div className="mt-4 rounded-md bg-green-50 p-3 text-sm text-green-600 dark:bg-green-900/20 dark:text-green-400">
            {success}
          </div>
        )}
      </div>

      {/* Campaign Structure Section */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="mb-4 text-lg font-semibold text-black dark:text-zinc-50">
          Campaign Structure
        </h3>
        <div className="space-y-4">
          {/* Client Name */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Client Name <span className="text-red-600 dark:text-red-400">*</span>
            </label>
            {isEditMode ? (
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                maxLength={25}
                className={`mt-1 block w-full rounded-md border px-3 py-2 text-black placeholder-zinc-400 shadow-sm focus:outline-none focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:ring-zinc-600 sm:text-sm ${
                  !clientName.trim() ? "border-red-300 focus:border-red-500 dark:border-red-700" : "border-zinc-300 focus:border-zinc-500 dark:focus:border-zinc-600"
                }`}
                placeholder="Enter client name"
              />
            ) : (
              <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-50">
                {campaign.campaign_structure.client_name || <span className="text-zinc-400">Not set</span>}
              </p>
            )}
          </div>

          {/* Client Summary */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Client Summary <span className="text-red-600 dark:text-red-400">*</span>
            </label>
            {isEditMode ? (
              <textarea
                value={clientSummary}
                onChange={(e) => setClientSummary(e.target.value)}
                maxLength={400}
                rows={4}
                className={`mt-1 block w-full rounded-md border px-3 py-2 text-black placeholder-zinc-400 shadow-sm focus:outline-none focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:ring-zinc-600 sm:text-sm ${
                  !clientSummary.trim() ? "border-red-300 focus:border-red-500 dark:border-red-700" : "border-zinc-300 focus:border-zinc-500 dark:focus:border-zinc-600"
                }`}
                placeholder="Enter client summary"
              />
            ) : (
              <div className="mt-1">
                <p className="text-sm text-zinc-900 dark:text-zinc-50 whitespace-pre-line">
                  {displaySummary || <span className="text-zinc-400">Not set</span>}
                </p>
                {shouldShowMore && !showMoreSummary && (
                  <button
                    onClick={() => setShowMoreSummary(true)}
                    className="mt-2 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                  >
                    See more
                  </button>
                )}
                {shouldShowMore && showMoreSummary && (
                  <button
                    onClick={() => setShowMoreSummary(false)}
                    className="mt-2 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                  >
                    See less
                  </button>
                )}
              </div>
            )}
            {isEditMode && (
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {clientSummary.length}/400 characters
              </p>
            )}
          </div>

          {/* CTA Configuration */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              CTA Configuration <span className="text-red-600 dark:text-red-400">*</span>
              <span className="ml-2 text-xs font-normal text-zinc-500 dark:text-zinc-400">
                (At least one required)
              </span>
            </label>
            <div className="mt-2 space-y-2">
              <div>
                <label className="block text-xs text-zinc-600 dark:text-zinc-400">
                  Schedule Meeting URL
                </label>
                {isEditMode ? (
                  <input
                    type="url"
                    value={ctaScheduleMeeting}
                    onChange={(e) => setCtaScheduleMeeting(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-black placeholder-zinc-400 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-zinc-600 dark:focus:ring-zinc-600 sm:text-sm"
                    placeholder="https://calendly.com/..."
                  />
                ) : (
                  <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-50">
                    {campaign.cta_config.schedule_meeting || <span className="text-zinc-400">Not set</span>}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs text-zinc-600 dark:text-zinc-400">
                  Email (mailto)
                </label>
                {isEditMode ? (
                  <input
                    type="email"
                    value={ctaMailto}
                    onChange={(e) => setCtaMailto(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-black placeholder-zinc-400 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-zinc-600 dark:focus:ring-zinc-600 sm:text-sm"
                    placeholder="email@example.com"
                  />
                ) : (
                  <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-50">
                    {campaign.cta_config.mailto || <span className="text-zinc-400">Not set</span>}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs text-zinc-600 dark:text-zinc-400">
                  LinkedIn URL
                </label>
                {isEditMode ? (
                  <input
                    type="url"
                    value={ctaLinkedin}
                    onChange={(e) => setCtaLinkedin(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-black placeholder-zinc-400 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-zinc-600 dark:focus:ring-zinc-600 sm:text-sm"
                    placeholder="https://linkedin.com/in/..."
                  />
                ) : (
                  <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-50">
                    {campaign.cta_config.linkedin || <span className="text-zinc-400">Not set</span>}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs text-zinc-600 dark:text-zinc-400">
                  Phone
                </label>
                {isEditMode ? (
                  <input
                    type="tel"
                    value={ctaPhone}
                    onChange={(e) => setCtaPhone(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-black placeholder-zinc-400 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-zinc-600 dark:focus:ring-zinc-600 sm:text-sm"
                    placeholder="+1234567890"
                  />
                ) : (
                  <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-50">
                    {campaign.cta_config.phone || <span className="text-zinc-400">Not set</span>}
                  </p>
                )}
              </div>
            </div>
            {isEditMode && (
              <p className={`mt-2 text-xs ${
                !ctaScheduleMeeting?.trim() && !ctaMailto?.trim() && !ctaLinkedin?.trim() && !ctaPhone?.trim()
                  ? "text-red-600 dark:text-red-400"
                  : "text-zinc-500 dark:text-zinc-400"
              }`}>
                {!ctaScheduleMeeting?.trim() && !ctaMailto?.trim() && !ctaLinkedin?.trim() && !ctaPhone?.trim()
                  ? "At least one CTA is required"
                  : "At least one CTA is required"}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Client Services Section */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="mb-4 text-lg font-semibold text-black dark:text-zinc-50">
          Client Services <span className="text-red-600 dark:text-red-400">*</span>
          <span className="ml-2 text-sm font-normal text-zinc-500 dark:text-zinc-400">
            (At least one service with case study required)
          </span>
        </h3>
        {initialServices.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            No services added yet. Service management will be implemented in a future phase.
          </p>
        ) : (
          <div className="space-y-2">
            {initialServices.map((service) => (
              <Accordion key={service.client_service_id} title={service.client_service_name}>
                <div className="space-y-2">
                  {service.caseStudies.length === 0 ? (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      No case studies added yet. Case study management will be implemented in a future phase.
                    </p>
                  ) : (
                    service.caseStudies.map((caseStudy) => (
                      <div
                        key={caseStudy.case_id}
                        className="rounded-md border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900"
                      >
                        <h4 className="font-medium text-black dark:text-zinc-50">
                          {caseStudy.case_name}
                        </h4>
                        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                          {caseStudy.case_summary}
                        </p>
                        {caseStudy.case_study_url && (
                          <a
                            href={caseStudy.case_study_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-block text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                          >
                            View Case Study →
                          </a>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </Accordion>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

