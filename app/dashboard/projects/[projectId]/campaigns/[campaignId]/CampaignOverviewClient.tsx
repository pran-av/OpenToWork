"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { CampaignData, ClientService, CaseStudy } from "@/lib/db/campaigns";
import type { ProjectData } from "@/lib/db/projects";
import { Accordion } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Plus, X, Trash2 } from "lucide-react";

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

// Client Services Section Component
function ClientServicesSection({
  services,
  setServices,
  openAccordions,
  onToggleAccordion,
  isEditMode,
  onAddService,
  onDeleteService,
  pendingCaseStudyOps,
  setPendingCaseStudyOps,
  campaignId,
  onSaveCaseStudy,
}: {
  services: ServiceWithCaseStudies[];
  setServices: React.Dispatch<React.SetStateAction<ServiceWithCaseStudies[]>>;
  openAccordions: Set<string>;
  onToggleAccordion: (serviceId: string) => void;
  isEditMode: boolean;
  onAddService: () => void;
  onDeleteService: (serviceId: string) => void;
  pendingCaseStudyOps: Array<{
    type: "create" | "update" | "delete";
    tempId?: string;
    caseId?: string;
    serviceId?: string;
    data?: any;
  }>;
  setPendingCaseStudyOps: React.Dispatch<React.SetStateAction<Array<{
    type: "create" | "update" | "delete";
    tempId?: string;
    caseId?: string;
    serviceId?: string;
    data?: any;
  }>>>;
  campaignId: string;
  onSaveCaseStudy: (caseStudy: CaseStudy, serviceId: string) => Promise<void>;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-black dark:text-zinc-50">
            Client Services <span className="text-red-600 dark:text-red-400">*</span>
            <span className="ml-2 text-sm font-normal text-zinc-500 dark:text-zinc-400">
              (At least one service with case study required)
            </span>
          </h3>
        </div>
        {isEditMode && (
          <button
            onClick={onAddService}
            className="flex items-center gap-2 rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
          >
            <Plus className="h-4 w-4" />
            Add Service
          </button>
        )}
      </div>
      {services.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No services added yet. Click "Add Service" to get started.
        </p>
      ) : (
        <div className="space-y-2">
          {services.map((service) => (
            <div key={service.client_service_id} className="rounded-lg border border-zinc-200 dark:border-zinc-800">
              <div className="relative">
                <Accordion
                  title={service.client_service_name}
                  isOpen={openAccordions.has(service.client_service_id)}
                  onToggle={() => onToggleAccordion(service.client_service_id)}
                >
                <div className="space-y-4 px-4 pb-4">
                  {isEditMode && (
                    <div>
                      <button
                        onClick={() => {
                          const tempId = `temp-case-${Date.now()}`;
                          const newCaseStudy: CaseStudy = {
                            case_id: tempId,
                            client_service_id: service.client_service_id,
                            case_name: "",
                            case_summary: "",
                            case_duration: "",
                            case_highlights: "",
                            case_study_url: "",
                          };
                          setServices(prev => prev.map(s => 
                            s.client_service_id === service.client_service_id
                              ? { ...s, caseStudies: [...s.caseStudies, newCaseStudy] }
                              : s
                          ));
                        }}
                        className="flex items-center gap-2 rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                      >
                        <Plus className="h-4 w-4" />
                        Add Case Study
                      </button>
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        At least one case study is required
                      </p>
                    </div>
                  )}
                  {service.caseStudies.length === 0 ? (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      No case studies added yet.
                    </p>
                  ) : (
                    service.caseStudies.map((caseStudy) => (
                      <CaseStudyCard
                        key={caseStudy.case_id}
                        caseStudy={caseStudy}
                        serviceId={service.client_service_id}
                        isEditMode={isEditMode}
                        onUpdate={async (updates) => {
                          const updatedCaseStudy = { ...caseStudy, ...updates };
                          
                          // Update UI immediately
                          setServices(prev => prev.map(s => 
                            s.client_service_id === service.client_service_id
                              ? {
                                  ...s,
                                  caseStudies: s.caseStudies.map(cs =>
                                    cs.case_id === caseStudy.case_id ? updatedCaseStudy : cs
                                  ),
                                }
                              : s
                          ));

                          // Check if service has real ID (not temp)
                          const serviceHasRealId = !service.client_service_id.startsWith("temp-");
                          
                          if (serviceHasRealId) {
                            // Service exists in DB, save case study immediately
                            try {
                              await onSaveCaseStudy(updatedCaseStudy, service.client_service_id);
                              // Remove from pending operations if it was there
                              setPendingCaseStudyOps(prev => prev.filter(op => 
                                op.caseId !== caseStudy.case_id && op.tempId !== caseStudy.case_id
                              ));
                            } catch (error) {
                              console.error("Failed to save case study:", error);
                              // Revert UI update on error
                              setServices(prev => prev.map(s => 
                                s.client_service_id === service.client_service_id
                                  ? {
                                      ...s,
                                      caseStudies: s.caseStudies.map(cs =>
                                        cs.case_id === caseStudy.case_id ? caseStudy : cs
                                      ),
                                    }
                                  : s
                              ));
                            }
                          } else {
                            // Service is temp, add to pending operations
                            if (caseStudy.case_id.startsWith("temp-")) {
                              setPendingCaseStudyOps(prev => {
                                const existing = prev.find(op => op.caseId === caseStudy.case_id || op.tempId === caseStudy.case_id);
                                if (existing) {
                                  return prev.map(op => 
                                    (op.caseId === caseStudy.case_id || op.tempId === caseStudy.case_id)
                                      ? { ...op, data: { ...caseStudy, ...updates } }
                                      : op
                                  );
                                }
                                return [...prev, {
                                  type: "create",
                                  tempId: caseStudy.case_id,
                                  serviceId: service.client_service_id,
                                  data: { ...caseStudy, ...updates },
                                }];
                              });
                            } else {
                              setPendingCaseStudyOps(prev => [...prev, {
                                type: "update",
                                caseId: caseStudy.case_id,
                                serviceId: service.client_service_id,
                                data: updates,
                              }]);
                            }
                          }
                        }}
                        onDelete={() => {
                          setServices(prev => prev.map(s => 
                            s.client_service_id === service.client_service_id
                              ? {
                                  ...s,
                                  caseStudies: s.caseStudies.filter(cs => cs.case_id !== caseStudy.case_id),
                                }
                              : s
                          ));
                          if (!caseStudy.case_id.startsWith("temp-")) {
                            setPendingCaseStudyOps(prev => [...prev, {
                              type: "delete",
                              caseId: caseStudy.case_id,
                              serviceId: service.client_service_id,
                            }]);
                          } else {
                            setPendingCaseStudyOps(prev => prev.filter(op => op.caseId !== caseStudy.case_id));
                          }
                        }}
                      />
                    ))
                  )}
                </div>
              </Accordion>
              {isEditMode && (
                <button
                  onClick={() => onDeleteService(service.client_service_id)}
                  className="absolute right-2 top-4 flex items-center justify-center rounded-md p-2 text-red-600 transition-colors hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:text-red-400 dark:hover:bg-red-900/20"
                  title="Delete Service"
                  type="button"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Case Study Card Component
function CaseStudyCard({
  caseStudy,
  serviceId,
  isEditMode,
  onUpdate,
  onDelete,
}: {
  caseStudy: CaseStudy;
  serviceId: string;
  isEditMode: boolean;
  onUpdate: (updates: Partial<CaseStudy>) => void;
  onDelete: () => void;
}) {
  const [isEditing, setIsEditing] = useState(caseStudy.case_id.startsWith("temp-"));
  const [caseName, setCaseName] = useState(caseStudy.case_name || "");
  const [caseSummary, setCaseSummary] = useState(caseStudy.case_summary || "");
  const [caseDuration, setCaseDuration] = useState(caseStudy.case_duration || "");
  const [caseHighlights, setCaseHighlights] = useState<string[]>(
    caseStudy.case_highlights ? caseStudy.case_highlights.split(";").filter(h => h.trim()) : [""]
  );
  const [caseStudyUrl, setCaseStudyUrl] = useState(caseStudy.case_study_url || "");

  const handleSave = () => {
    if (!caseName.trim()) {
      return; // Validation will be shown
    }
    if (caseHighlights.length === 0 || !caseHighlights.some(h => h.trim())) {
      return; // At least one highlight required
    }

    onUpdate({
      case_name: caseName.trim(),
      case_summary: caseSummary.trim(),
      case_duration: caseDuration.trim(),
      case_highlights: caseHighlights.filter(h => h.trim()).join(";"),
      case_study_url: caseStudyUrl.trim(),
    });
    setIsEditing(false);
  };

  const handleAddHighlight = () => {
    setCaseHighlights([...caseHighlights, ""]);
  };

  const handleRemoveHighlight = (index: number) => {
    if (caseHighlights.length > 1) {
      setCaseHighlights(caseHighlights.filter((_, i) => i !== index));
    }
  };

  const handleHighlightChange = (index: number, value: string) => {
    const newHighlights = [...caseHighlights];
    newHighlights[index] = value;
    setCaseHighlights(newHighlights);
  };

  if (!isEditMode) {
    // View mode
    return (
      <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h4 className="font-medium text-black dark:text-zinc-50">
          {caseStudy.case_name}
        </h4>
        {caseStudy.case_summary && (
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {caseStudy.case_summary}
          </p>
        )}
        {caseStudy.case_duration && (
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Duration: {caseStudy.case_duration}
          </p>
        )}
        {caseStudy.case_highlights && (
          <ul className="mt-2 list-disc list-inside space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
            {caseStudy.case_highlights.split(";").filter(h => h.trim()).map((highlight, idx) => (
              <li key={idx}>{highlight.trim()}</li>
            ))}
          </ul>
        )}
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
    );
  }

  // Edit mode
  if (!isEditing) {
    return (
      <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h4 className="font-medium text-black dark:text-zinc-50">
              {caseStudy.case_name}
            </h4>
            {caseStudy.case_summary && (
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {caseStudy.case_summary}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsEditing(true)}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              Edit
            </button>
            <button
              onClick={onDelete}
              className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-700 dark:bg-zinc-800 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Case Name <span className="text-red-600 dark:text-red-400">*</span>
          </label>
          <input
            type="text"
            value={caseName}
            onChange={(e) => setCaseName(e.target.value)}
            maxLength={50}
            className={`mt-1 block w-full rounded-md border px-3 py-2 text-black placeholder-zinc-400 shadow-sm focus:outline-none focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:ring-zinc-600 sm:text-sm ${
              !caseName.trim() ? "border-red-300 focus:border-red-500 dark:border-red-700" : "border-zinc-300 focus:border-zinc-500 dark:focus:border-zinc-600"
            }`}
            placeholder="Enter case name"
          />
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {caseName.length}/50 characters
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Case Summary
          </label>
          <textarea
            value={caseSummary}
            onChange={(e) => setCaseSummary(e.target.value)}
            maxLength={100}
            rows={3}
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-black placeholder-zinc-400 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-zinc-600 dark:focus:ring-zinc-600 sm:text-sm"
            placeholder="Enter case summary"
          />
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {caseSummary.length}/100 characters
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Case Duration
          </label>
          <input
            type="text"
            value={caseDuration}
            onChange={(e) => setCaseDuration(e.target.value)}
            maxLength={50}
            className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-black placeholder-zinc-400 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-zinc-600 dark:focus:ring-zinc-600 sm:text-sm"
            placeholder="e.g., 12th Sep, 2024 to 13th Nov, 2024"
          />
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {caseDuration.length}/50 characters
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Case Highlights <span className="text-red-600 dark:text-red-400">*</span>
          </label>
          <div className="mt-2 space-y-2">
            {caseHighlights.map((highlight, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={highlight}
                  onChange={(e) => handleHighlightChange(index, e.target.value)}
                  className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-black placeholder-zinc-400 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-zinc-600 dark:focus:ring-zinc-600 sm:text-sm"
                  placeholder={`Highlight ${index + 1}`}
                />
                {caseHighlights.length > 1 && (
                  <button
                    onClick={() => handleRemoveHighlight(index)}
                    className="flex items-center justify-center rounded-md border border-zinc-300 bg-white p-2 text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={handleAddHighlight}
              className="flex items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              <Plus className="h-4 w-4" />
              Add Highlight
            </button>
          </div>
          {caseHighlights.length === 0 || !caseHighlights.some(h => h.trim()) ? (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
              At least one highlight is required
            </p>
          ) : null}
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Case Study URL
          </label>
          <input
            type="url"
            value={caseStudyUrl}
            onChange={(e) => setCaseStudyUrl(e.target.value)}
            className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-black placeholder-zinc-400 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-zinc-600 dark:focus:ring-zinc-600 sm:text-sm"
            placeholder="https://example.com"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={!caseName.trim() || !caseHighlights.some(h => h.trim())}
            className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
          >
            Save
          </button>
          <button
            onClick={() => {
              setIsEditing(false);
              // Reset to original values
              setCaseName(caseStudy.case_name || "");
              setCaseSummary(caseStudy.case_summary || "");
              setCaseDuration(caseStudy.case_duration || "");
              setCaseHighlights(caseStudy.case_highlights ? caseStudy.case_highlights.split(";").filter(h => h.trim()) : [""]);
              setCaseStudyUrl(caseStudy.case_study_url || "");
            }}
            className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
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

  // Services and Case Studies state with pending changes
  const [services, setServices] = useState<ServiceWithCaseStudies[]>(initialServices);
  const [openAccordions, setOpenAccordions] = useState<Set<string>>(
    new Set(initialServices.length === 1 ? [initialServices[0]?.client_service_id] : [])
  );
  const [pendingServiceOps, setPendingServiceOps] = useState<Array<{
    type: "create" | "update" | "delete";
    tempId?: string;
    serviceId?: string;
    data?: any;
  }>>([]);
  const [pendingCaseStudyOps, setPendingCaseStudyOps] = useState<Array<{
    type: "create" | "update" | "delete";
    tempId?: string;
    caseId?: string;
    serviceId?: string;
    data?: any;
  }>>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);

  // Add Service Modal state
  const [isAddServiceModalOpen, setIsAddServiceModalOpen] = useState(false);
  const [newServiceName, setNewServiceName] = useState("");
  const [serviceNameError, setServiceNameError] = useState<string | null>(null);

  // Delete Service Confirmation state
  const [deleteServiceId, setDeleteServiceId] = useState<string | null>(null);
  const [deleteServiceName, setDeleteServiceName] = useState<string>("");
  const [deleteServiceHasCaseStudies, setDeleteServiceHasCaseStudies] = useState(false);

  // Switch Campaign Modal state
  const [isSwitchModalOpen, setIsSwitchModalOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [availableCampaigns, setAvailableCampaigns] = useState<CampaignData[]>([]);
  const [selectedTargetCampaignId, setSelectedTargetCampaignId] = useState<string>("");
  const [currentActiveCampaign, setCurrentActiveCampaign] = useState<CampaignData | null>(null);

  // Check if any mandatory fields are empty (including services)
  const currentServicesCount = services.length;
  const hasEmptyMandatoryFields = 
    !clientName.trim() ||
    !clientSummary.trim() ||
    (!ctaScheduleMeeting?.trim() && !ctaMailto?.trim() && !ctaLinkedin?.trim() && !ctaPhone?.trim()) ||
    currentServicesCount === 0 ||
    services.some(service => service.caseStudies.length === 0);

  useEffect(() => {
    setIsPublishable(!hasEmptyMandatoryFields);
  }, [hasEmptyMandatoryFields]);

  // Track unsaved changes
  useEffect(() => {
    const hasChanges = 
      pendingServiceOps.length > 0 || 
      pendingCaseStudyOps.length > 0 ||
      campaignName !== initialCampaign.campaign_name ||
      clientName !== (initialCampaign.campaign_structure.client_name || "") ||
      clientSummary !== (initialCampaign.campaign_structure.client_summary || "") ||
      ctaScheduleMeeting !== (initialCampaign.cta_config.schedule_meeting || "") ||
      ctaMailto !== (initialCampaign.cta_config.mailto || "") ||
      ctaLinkedin !== (initialCampaign.cta_config.linkedin || "") ||
      ctaPhone !== (initialCampaign.cta_config.phone || "");
    setHasUnsavedChanges(hasChanges);
  }, [
    pendingServiceOps,
    pendingCaseStudyOps,
    campaignName,
    clientName,
    clientSummary,
    ctaScheduleMeeting,
    ctaMailto,
    ctaLinkedin,
    ctaPhone,
    initialCampaign,
  ]);

  // Handle back navigation with unsaved changes warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Service management functions
  const handleAddService = () => {
    if (!newServiceName.trim()) {
      setServiceNameError("Service name is required");
      return;
    }
    if (newServiceName.trim().length > 50) {
      setServiceNameError("Service name must be 50 characters or less");
      return;
    }

    const tempId = `temp-${Date.now()}`;
    const newOrderIndex = services.length + 1;
    const newService: ServiceWithCaseStudies = {
      client_service_id: tempId,
      campaign_id: campaign.campaign_id,
      client_service_name: newServiceName.trim(),
      order_index: newOrderIndex,
      caseStudies: [],
    };

    setServices([...services, newService]);
    setPendingServiceOps([...pendingServiceOps, {
      type: "create",
      tempId,
      data: {
        client_service_name: newServiceName.trim(),
        order_index: newOrderIndex,
      },
    }]);
    // Open only the newly added service (close others)
    setOpenAccordions(new Set([tempId]));
    setIsAddServiceModalOpen(false);
    setNewServiceName("");
    setServiceNameError(null);
  };

  const handleDeleteService = (serviceId: string) => {
    const service = services.find(s => s.client_service_id === serviceId);
    if (!service) return;

    if (service.caseStudies.length > 0) {
      setDeleteServiceId(serviceId);
      setDeleteServiceName(service.client_service_name);
      setDeleteServiceHasCaseStudies(true);
    } else {
      confirmDeleteService(serviceId);
    }
  };

  const confirmDeleteService = (serviceId: string) => {
    const service = services.find(s => s.client_service_id === serviceId);
    if (!service) return;

    // Remove from UI
    setServices(services.filter(s => s.client_service_id !== serviceId));
    
    // Add to pending operations
    if (serviceId.startsWith("temp-")) {
      // Remove create operation if it was pending
      setPendingServiceOps(pendingServiceOps.filter(op => op.tempId !== serviceId));
    } else {
      setPendingServiceOps([...pendingServiceOps, {
        type: "delete",
        serviceId,
      }]);
    }

    // Also delete all case studies for this service
    const caseStudyOps = service.caseStudies.map(cs => ({
      type: "delete" as const,
      caseId: cs.case_id,
      serviceId,
    }));
    setPendingCaseStudyOps([...pendingCaseStudyOps, ...caseStudyOps]);

    // Close accordion
    const newOpen = new Set(openAccordions);
    newOpen.delete(serviceId);
    setOpenAccordions(newOpen);

    // Reset delete confirmation
    setDeleteServiceId(null);
    setDeleteServiceName("");
    setDeleteServiceHasCaseStudies(false);
  };

  const handleToggleAccordion = (serviceId: string) => {
    const newOpen = new Set(openAccordions);
    if (newOpen.has(serviceId)) {
      newOpen.delete(serviceId);
    } else {
      newOpen.add(serviceId);
    }
    setOpenAccordions(newOpen);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // Save campaign updates
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

      const campaignRes = await fetch(`/api/campaigns/${campaign.campaign_id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });

      const campaignData = await campaignRes.json();

      if (!campaignRes.ok) {
        setError(campaignData.error || "Failed to save campaign");
        setIsSaving(false);
        return;
      }

      // Build service ID map for case study operations
      const serviceIdMap = new Map<string, string>();
      
      // Save services if there are pending operations
      if (pendingServiceOps.length > 0) {
        const servicesRes = await fetch(`/api/campaigns/${campaign.campaign_id}/services`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ operations: pendingServiceOps }),
        });

        const servicesData = await servicesRes.json();

        if (!servicesRes.ok) {
          setError(servicesData.error || "Failed to save services");
          setIsSaving(false);
          return;
        }

        // Build service ID map from temp IDs to real IDs
        servicesData.results.forEach((result: any) => {
          if (result.type === "create" && result.id && result.service) {
            serviceIdMap.set(result.id, result.service.client_service_id);
          }
        });

        // Update services with real IDs
        setServices(prevServices => 
          prevServices.map(service => {
            if (serviceIdMap.has(service.client_service_id)) {
              return {
                ...service,
                client_service_id: serviceIdMap.get(service.client_service_id)!,
              };
            }
            return service;
          })
        );
      }

      // Save case studies if there are pending operations
      if (pendingCaseStudyOps.length > 0) {
        // Map temp service IDs to real IDs using the map
        const mappedOps = pendingCaseStudyOps.map(op => {
          if (op.serviceId?.startsWith("temp-")) {
            const realServiceId = serviceIdMap.get(op.serviceId);
            if (realServiceId) {
              return { ...op, serviceId: realServiceId };
            }
            // If service wasn't found in map, it might have been deleted, skip it
            return null;
          }
          return op;
        }).filter((op): op is NonNullable<typeof op> => op !== null && !op.serviceId?.startsWith("temp-"));

        if (mappedOps.length > 0) {
          const caseStudiesRes = await fetch(`/api/campaigns/${campaign.campaign_id}/case-studies`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ operations: mappedOps }),
          });

          const caseStudiesData = await caseStudiesRes.json();

          if (!caseStudiesRes.ok) {
            setError(caseStudiesData.error || "Failed to save case studies");
            setIsSaving(false);
            return;
          }

          // Update case study IDs from temp to real
          const caseStudyIdMap = new Map<string, string>();
          caseStudiesData.results?.forEach((result: any) => {
            if (result.type === "create" && result.id && result.caseStudy) {
              caseStudyIdMap.set(result.id, result.caseStudy.case_id);
            }
          });

          // Update services with real case study IDs
          if (caseStudyIdMap.size > 0) {
            setServices(prevServices => 
              prevServices.map(service => ({
                ...service,
                caseStudies: service.caseStudies.map(cs => {
                  if (caseStudyIdMap.has(cs.case_id)) {
                    return { ...cs, case_id: caseStudyIdMap.get(cs.case_id)! };
                  }
                  return cs;
                }),
              }))
            );
          }
        }
      }

      // Refresh the page to get updated data
      window.location.reload();
    } catch (error) {
      setError("An unexpected error occurred");
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!isPublishable) return;

    setIsPublishing(true);
    setError(null);
    setSuccess(null);

    try {
      // First save any unsaved changes (without reloading)
      if (hasUnsavedChanges) {
        setIsSaving(true);
        try {
          // Save campaign updates
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

          const campaignRes = await fetch(`/api/campaigns/${campaign.campaign_id}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(updates),
          });

          if (!campaignRes.ok) {
            const campaignData = await campaignRes.json();
            throw new Error(campaignData.error || "Failed to save campaign");
          }

          // Save services and case studies if needed
          if (pendingServiceOps.length > 0 || pendingCaseStudyOps.length > 0) {
            // Save services first
            if (pendingServiceOps.length > 0) {
              const servicesRes = await fetch(`/api/campaigns/${campaign.campaign_id}/services`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ operations: pendingServiceOps }),
              });

              if (!servicesRes.ok) {
                const servicesData = await servicesRes.json();
                throw new Error(servicesData.error || "Failed to save services");
              }
            }

            // Save case studies
            if (pendingCaseStudyOps.length > 0) {
              const caseStudiesRes = await fetch(`/api/campaigns/${campaign.campaign_id}/case-studies`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ operations: pendingCaseStudyOps }),
              });

              if (!caseStudiesRes.ok) {
                const caseStudiesData = await caseStudiesRes.json();
                throw new Error(caseStudiesData.error || "Failed to save case studies");
              }
            }
          }
        } catch (saveError: any) {
          setError(saveError.message || "Failed to save changes before publishing");
          setIsPublishing(false);
          setIsSaving(false);
          return;
        }
        setIsSaving(false);
      }

      // Now publish the campaign
      const res = await fetch(`/api/campaigns/${campaign.campaign_id}/publish`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to publish campaign");
        setIsPublishing(false);
        return;
      }

      setSuccess(data.message || "Campaign published successfully!");
      
      // Redirect to project overview after a short delay
      setTimeout(() => {
        router.push(`/dashboard/projects/${project.project_id}`);
      }, 1500);
    } catch (error: any) {
      setError(error.message || "An unexpected error occurred");
      setIsPublishing(false);
    }
  };

  const fetchAvailableCampaigns = async () => {
    try {
      const res = await fetch(`/api/projects/${project.project_id}/campaigns`);
      const data = await res.json();
      
      if (res.ok) {
        const allCampaigns = data.campaigns || [];
        const active = data.activeCampaign || null;
        
        // For PAUSED campaigns, include the current campaign in available list (for "Make Active")
        // For other cases, filter out the current campaign
        const available = allCampaigns.filter((c: CampaignData) => {
          // Only include DRAFT or PAUSED campaigns
          if (c.campaign_status !== "DRAFT" && c.campaign_status !== "PAUSED") {
            return false;
          }
          
          // If current campaign is PAUSED, include it in the list
          if (campaign.campaign_status === "PAUSED" && c.campaign_id === campaign.campaign_id) {
            return true;
          }
          
          // For all other cases, exclude the current campaign
          return c.campaign_id !== campaign.campaign_id;
        });
        
        setAvailableCampaigns(available);
        setCurrentActiveCampaign(active);
        
        // Pre-select the current campaign if it's PAUSED (for "Make Active")
        if (campaign.campaign_status === "PAUSED") {
          setSelectedTargetCampaignId(campaign.campaign_id);
        } else if (campaign.campaign_status === "DRAFT" && available.length > 0) {
          // For DRAFT campaigns, pre-select if it's in the available list
          const preSelect = available.find((c: CampaignData) => c.campaign_id === campaign.campaign_id);
          if (preSelect) {
            setSelectedTargetCampaignId(campaign.campaign_id);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching campaigns:", error);
    }
  };

  const handleSwitchCampaign = async () => {
    // If this is a DRAFT or PAUSED campaign, pre-select it and open modal
    if (campaign.campaign_status !== "ACTIVE") {
      await fetchAvailableCampaigns();
      setIsSwitchModalOpen(true);
      return;
    }

    // If this is ACTIVE campaign, fetch campaigns and open modal
    await fetchAvailableCampaigns();
    setIsSwitchModalOpen(true);
  };

  const handleConfirmSwitch = async () => {
    if (!selectedTargetCampaignId) {
      setError("Please select a campaign to switch to");
      return;
    }

    setIsSwitching(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/campaigns/switch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId: project.project_id,
          targetCampaignId: selectedTargetCampaignId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to switch campaign");
        setIsSwitching(false);
        return;
      }

      setSuccess(data.message || "Campaign switched successfully!");
      setIsSwitchModalOpen(false);
      
      // Redirect to project overview after a short delay
      setTimeout(() => {
        router.push(`/dashboard/projects/${project.project_id}`);
      }, 1500);
    } catch (error: any) {
      setError(error.message || "An unexpected error occurred");
      setIsSwitching(false);
    }
  };

  // Handle back navigation with unsaved changes
  const handleBackClick = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowUnsavedWarning(true);
    } else {
      router.back();
    }
  }, [hasUnsavedChanges, router]);

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
      return hasActiveCampaign ? "Switch to Current" : "Publish Campaign";
    }
    if (campaign.campaign_status === "PAUSED") {
      return "Make Active";
    }
    return "Switch Campaign";
  };

  const shouldShowPrimaryCTA = () => {
    if (campaign.campaign_status === "ACTIVE") {
      // Only show if there are other campaigns (need to check)
      // For now, show it - will be disabled if no other campaigns
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
      {/* Action Buttons - Above Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        {shouldShowPrimaryCTA() && (
          <button
            onClick={() => {
              if (campaign.campaign_status === "ACTIVE") {
                handleSwitchCampaign();
              } else if (campaign.campaign_status === "PAUSED") {
                handleSwitchCampaign();
              } else if (campaign.campaign_status === "DRAFT" && hasActiveCampaign) {
                // DRAFT with active campaign = Switch to Current
                handleSwitchCampaign();
              } else {
                // DRAFT without active campaign = Publish
                handlePublish();
              }
            }}
            disabled={
              (campaign.campaign_status === "DRAFT" && !hasActiveCampaign && !isPublishable) ||
              isPublishing ||
              isSwitching ||
              project.is_archived
            }
            className="w-full rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
          >
            {(isPublishing || isSwitching) ? "Processing..." : getPrimaryCTALabel()}
          </button>
        )}
        {isEditMode && (
          <button
            onClick={handleSave}
            disabled={isSaving || project.is_archived}
            className="w-full rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            {isSaving ? "Saving..." : "Save Campaign"}
          </button>
        )}
      </div>

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
            <div className="mt-2 flex flex-wrap items-center gap-4">
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusBadgeColor()}`}>
                {campaign.campaign_status}
              </span>
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                Created {new Date(campaign.created_at).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })}
              </span>
              {project.project_url && campaign.campaign_status === "ACTIVE" && (
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  {project.project_url}
                </span>
              )}
            </div>
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
      <ClientServicesSection
        services={services}
        setServices={setServices}
        openAccordions={openAccordions}
        onToggleAccordion={handleToggleAccordion}
        isEditMode={isEditMode}
        onAddService={() => setIsAddServiceModalOpen(true)}
        onDeleteService={handleDeleteService}
        pendingCaseStudyOps={pendingCaseStudyOps}
        setPendingCaseStudyOps={setPendingCaseStudyOps}
        campaignId={campaign.campaign_id}
        onSaveCaseStudy={async (caseStudy, serviceId) => {
          if (caseStudy.case_id.startsWith("temp-")) {
            // Create new case study
            const res = await fetch(`/api/campaigns/${campaign.campaign_id}/case-studies`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                operations: [{
                  type: "create",
                  serviceId,
                  data: {
                    case_name: caseStudy.case_name,
                    case_summary: caseStudy.case_summary || undefined,
                    case_duration: caseStudy.case_duration || undefined,
                    case_highlights: caseStudy.case_highlights,
                    case_study_url: caseStudy.case_study_url || undefined,
                  },
                }],
              }),
            });

            const data = await res.json();
            if (!res.ok) {
              throw new Error(data.error || "Failed to save case study");
            }

            // Update case study ID from temp to real
            if (data.results && data.results.length > 0 && data.results[0].caseStudy) {
              setServices(prev => prev.map(s => 
                s.client_service_id === serviceId
                  ? {
                      ...s,
                      caseStudies: s.caseStudies.map(cs =>
                        cs.case_id === caseStudy.case_id
                          ? { ...cs, case_id: data.results[0].caseStudy.case_id }
                          : cs
                      ),
                    }
                  : s
              ));
            }
          } else {
            // Update existing case study
            const res = await fetch(`/api/campaigns/${campaign.campaign_id}/case-studies`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                operations: [{
                  type: "update",
                  caseId: caseStudy.case_id,
                  serviceId,
                  data: {
                    case_name: caseStudy.case_name,
                    case_summary: caseStudy.case_summary || undefined,
                    case_duration: caseStudy.case_duration || undefined,
                    case_highlights: caseStudy.case_highlights,
                    case_study_url: caseStudy.case_study_url || undefined,
                  },
                }],
              }),
            });

            const data = await res.json();
            if (!res.ok) {
              throw new Error(data.error || "Failed to update case study");
            }
          }
        }}
      />

      {/* Add Service Modal */}
      <Dialog open={isAddServiceModalOpen} onOpenChange={setIsAddServiceModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Service</DialogTitle>
            <DialogDescription>
              Enter a name for the service. Service names must not exceed 50 characters.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Service Name <span className="text-red-600 dark:text-red-400">*</span>
              </label>
              <input
                type="text"
                value={newServiceName}
                onChange={(e) => {
                  setNewServiceName(e.target.value);
                  setServiceNameError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !serviceNameError && newServiceName.trim()) {
                    handleAddService();
                  }
                }}
                maxLength={50}
                className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-black placeholder-zinc-400 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-zinc-600 dark:focus:ring-zinc-600 sm:text-sm"
                placeholder="Service Name"
                autoFocus
              />
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {newServiceName.length}/50 characters
              </p>
              {serviceNameError && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {serviceNameError}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <button
              onClick={() => {
                setIsAddServiceModalOpen(false);
                setNewServiceName("");
                setServiceNameError(null);
              }}
              className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              Close
            </button>
            <button
              onClick={handleAddService}
              disabled={!newServiceName.trim() || !!serviceNameError}
              className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
            >
              Add
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Service Confirmation Modal */}
      <Dialog open={!!deleteServiceId} onOpenChange={(open) => {
        if (!open) {
          setDeleteServiceId(null);
          setDeleteServiceName("");
          setDeleteServiceHasCaseStudies(false);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Service</DialogTitle>
            <DialogDescription>
              {deleteServiceHasCaseStudies
                ? `This service "${deleteServiceName}" contains case studies. Deleting it will also delete all associated case studies. This action cannot be undone.`
                : `Are you sure you want to delete "${deleteServiceName}"? This action cannot be undone.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              onClick={() => {
                setDeleteServiceId(null);
                setDeleteServiceName("");
                setDeleteServiceHasCaseStudies(false);
              }}
              className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              Abort
            </button>
            <button
              onClick={() => deleteServiceId && confirmDeleteService(deleteServiceId)}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unsaved Changes Warning Modal */}
      <Dialog open={showUnsavedWarning} onOpenChange={setShowUnsavedWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unsaved Changes</DialogTitle>
            <DialogDescription>
              You have unsaved changes. Do you want to save them before leaving?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              onClick={() => {
                setShowUnsavedWarning(false);
                // Revert changes - reload page
                window.location.reload();
              }}
              className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              Revert
            </button>
            <button
              onClick={async () => {
                setShowUnsavedWarning(false);
                await handleSave();
              }}
              className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
            >
              Save
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Switch Campaign Modal */}
      <Dialog open={isSwitchModalOpen} onOpenChange={(open) => {
        if (!isSwitching) {
          setIsSwitchModalOpen(open);
          if (!open) {
            setSelectedTargetCampaignId("");
            setError(null);
          }
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Switch Campaign</DialogTitle>
            <DialogDescription>
              {currentActiveCampaign 
                ? `Switch from "${currentActiveCampaign.campaign_name}" to another campaign. The current active campaign will be paused.`
                : "Select a campaign to activate. This will make it the active campaign for this project."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {currentActiveCampaign && (
              <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Current Active Campaign:
                </p>
                <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-50">
                  {currentActiveCampaign.campaign_name}
                </p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Switch To Campaign <span className="text-red-600 dark:text-red-400">*</span>
              </label>
              {availableCampaigns.length === 0 ? (
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                  No other campaigns available to switch to.
                </p>
              ) : (
                <select
                  value={selectedTargetCampaignId}
                  onChange={(e) => setSelectedTargetCampaignId(e.target.value)}
                  disabled={isSwitching}
                  className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-black shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-zinc-600 dark:focus:ring-zinc-600 sm:text-sm"
                >
                  <option value="">Select a campaign...</option>
                  {availableCampaigns.map((c) => (
                    <option key={c.campaign_id} value={c.campaign_id}>
                      {c.campaign_name} ({c.campaign_status})
                    </option>
                  ))}
                </select>
              )}
            </div>
            {currentActiveCampaign && (
              <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-900/20">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>Warning:</strong> This will atomically switch campaigns. The current active campaign will be paused and the selected campaign will become active. The project URL will remain unchanged.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <button
              onClick={() => {
                setIsSwitchModalOpen(false);
                setSelectedTargetCampaignId("");
                setError(null);
              }}
              disabled={isSwitching}
              className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmSwitch}
              disabled={isSwitching || !selectedTargetCampaignId || availableCampaigns.length === 0}
              className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
            >
              {isSwitching ? "Switching..." : "Confirm Switch"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

