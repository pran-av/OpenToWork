"use client";

import { useState, useEffect, useCallback, useLayoutEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { CampaignData, ClientService, CaseStudy } from "@/lib/db/campaigns";
import type { ProjectData } from "@/lib/db/projects";
import type { AttachedExperienceCaseStudy } from "@/lib/db/experience";
import { Accordion } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Plus, X, Trash2, RefreshCw, Mail, Phone, Linkedin, Calendar } from "lucide-react";
import { useCampaignAnalytics } from "@/hooks/useCampaignAnalytics";
import { emitStudioCampaignWriteMode } from "@/hooks/useStudioCampaignWriteChrome";
import AnalyticsCards from "@/components/dashboard/AnalyticsCards";
import StudioBackButton from "@/components/dashboard/StudioBackButton";
import {
  clampSearchQueryInput,
  isUuid,
  sanitizeOptionalHttpUrl,
  sanitizePlainTextLine,
  sanitizePlainTextMultiline,
  sanitizeSearchQuery,
} from "@/lib/utils/client-input-security";
import {
  SAGE_ONBOARDING_CAMPAIGN_EDITOR_PATH_KEY,
  SAGE_ONBOARDING_PROJECT_EDITOR_PATH_KEY,
} from "@/lib/sage-onboarding-nav";
import { dispatchSagePrimaryActionDone } from "@/lib/sage-onboarding-primary";
import { cn } from "@/lib/utils";

/** True while Sage tour applies `sage-target-highlight` to `#campaign-link-experiences`. */
function useCampaignLinkExperiencesSagePulse(pathname: string): boolean {
  const [active, setActive] = useState(false);

  useEffect(() => {
    let mo: MutationObserver | null = null;
    let rafId = 0;
    let cancelled = false;
    let attempts = 0;

    const tryAttach = () => {
      if (cancelled) return;
      const el = document.getElementById("campaign-link-experiences");
      if (!el) {
        attempts += 1;
        if (attempts < 180) rafId = window.requestAnimationFrame(tryAttach);
        return;
      }
      const sync = () => setActive(el.classList.contains("sage-target-highlight"));
      sync();
      mo = new MutationObserver(sync);
      mo.observe(el, { attributes: true, attributeFilter: ["class"] });
    };

    tryAttach();

    return () => {
      cancelled = true;
      if (rafId) window.cancelAnimationFrame(rafId);
      mo?.disconnect();
    };
  }, [pathname]);

  return active;
}

interface ServiceWithCaseStudies extends ClientService {
  caseStudies: CaseStudy[];
}

interface CampaignOverviewClientProps {
  campaign: CampaignData;
  project: ProjectData;
  servicesWithCaseStudies: ServiceWithCaseStudies[];
  attachedCaseStudies: AttachedExperienceCaseStudy[];
  hasActiveCampaign: boolean;
  isPublishable: boolean;
}

type ExperienceSearchResult = {
  case_id: string;
  service_class_id: string;
  service_class_name: string;
  case_name: string;
  case_summary: string | null;
  case_duration: string | null;
  display_year: number;
  case_highlights: string;
  case_study_url: string | null;
  created_at: string;
};

function ExperienceSearchPickRow({
  result,
  isEditMode,
  isMutatingAttach,
  alreadyAttached,
  onAttach,
  onDetach,
  sageOnboardingPulse,
}: {
  result: ExperienceSearchResult;
  isEditMode: boolean;
  isMutatingAttach: boolean;
  alreadyAttached: boolean;
  onAttach: (r: ExperienceSearchResult) => void;
  onDetach: (caseId: string) => void;
  /** Pulse Add / full-card tap target while Sage highlights the link-experiences section */
  sageOnboardingPulse?: boolean;
}) {
  const showPulse = Boolean(sageOnboardingPulse && isEditMode && !alreadyAttached && !isMutatingAttach);

  return (
    <div
      className={`relative rounded-md border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800 ${
        alreadyAttached
          ? "max-lg:ring-2 max-lg:ring-blue-500 max-lg:border-blue-500 dark:max-lg:ring-blue-400 dark:max-lg:border-blue-400"
          : ""
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 pr-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-orange-600 dark:text-orange-400">
            {result.service_class_name}
          </p>
          <h4 className="mt-1 text-sm font-semibold text-black dark:text-zinc-50">{result.case_name}</h4>
          {result.case_summary ? (
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{result.case_summary}</p>
          ) : null}
        </div>
        {isEditMode ? (
          <button
            type="button"
            disabled={alreadyAttached || isMutatingAttach}
            onClick={() => onAttach(result)}
            className={cn(
              "hidden rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 lg:inline-flex dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-700",
              showPulse && "sage-experience-pick-pulse"
            )}
          >
            {alreadyAttached ? "Attached" : "Add"}
          </button>
        ) : null}
      </div>
      {isEditMode ? (
        <button
          type="button"
          disabled={isMutatingAttach}
          aria-label={
            alreadyAttached
              ? `Remove ${result.case_name} from campaign`
              : `Add ${result.case_name} to campaign`
          }
          className={cn(
            "absolute inset-0 z-10 cursor-pointer rounded-md border-0 bg-transparent p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 lg:hidden",
            showPulse && "sage-experience-pick-pulse"
          )}
          onClick={() => {
            if (isMutatingAttach) return;
            if (alreadyAttached) {
              onDetach(result.case_id);
            } else {
              onAttach(result);
            }
          }}
        >
        </button>
      ) : null}
    </div>
  );
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
    <div className="rounded-lg border border-orange-100 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-black dark:text-zinc-50">
            Client Services <span className="text-red-600 dark:text-red-400">*</span>
            <span className="ml-2 text-sm font-normal text-gray-500 dark:text-zinc-400">
              (At least one service with case study required)
            </span>
          </h3>
        </div>
        {isEditMode && (
          <button
            onClick={onAddService}
            className="flex items-center gap-2 rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
          >
            <Plus className="h-4 w-4" />
            Add Service
          </button>
        )}
      </div>
      {services.length === 0 ? (
        <p className="text-sm text-gray-600 dark:text-zinc-400">
          No services added yet. Click "Add Service" to get started.
        </p>
      ) : (
        <div className="space-y-2">
          {services.map((service) => (
            <div key={service.client_service_id} className="rounded-lg border border-orange-100 dark:border-zinc-800">
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
                        className="flex items-center gap-2 rounded-md border border-orange-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                      >
                        <Plus className="h-4 w-4" />
                        Add Case Study
                      </button>
                      <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">
                        At least one case study is required
                      </p>
                    </div>
                  )}
                  {service.caseStudies.length === 0 ? (
                    <p className="text-sm text-gray-600 dark:text-zinc-400">
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

                          // Check if service has real UUID (not temp)
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
                  className="absolute right-2 top-4 z-10 flex items-center justify-center rounded-md p-2 text-red-600 transition-colors hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:text-red-400 dark:hover:bg-red-900/20"
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
    if (!caseDuration.trim()) {
      return;
    }
    if (caseHighlights.length === 0 || !caseHighlights.some(h => h.trim())) {
      return; // At least one highlight required
    }
    const urlRaw = caseStudyUrl.trim();
    const sanitizedUrl = sanitizeOptionalHttpUrl(caseStudyUrl);
    if (urlRaw.length > 0 && !sanitizedUrl) {
      return;
    }

    onUpdate({
      case_name: sanitizePlainTextLine(caseName, 50),
      case_summary: sanitizePlainTextMultiline(caseSummary, 100),
      case_duration: sanitizePlainTextLine(caseDuration, 50),
      case_highlights: caseHighlights
        .map((h) => sanitizePlainTextLine(h, 200))
        .filter(Boolean)
        .join(";"),
      case_study_url: sanitizedUrl,
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
    newHighlights[index] = sanitizePlainTextLine(value, 200);
    setCaseHighlights(newHighlights);
  };

  if (!isEditMode) {
    const safeCaseStudyUrl = caseStudy.case_study_url
      ? sanitizeOptionalHttpUrl(caseStudy.case_study_url)
      : "";
    // View mode
    return (
      <div className="rounded-md border border-orange-100 bg-orange-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h4 className="font-medium text-black dark:text-zinc-50">
          {caseStudy.case_name}
        </h4>
        {caseStudy.case_summary && (
          <p className="mt-1 text-sm text-gray-600 dark:text-zinc-400">
            {caseStudy.case_summary}
          </p>
        )}
        {caseStudy.case_duration && (
          <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">
            Duration: {caseStudy.case_duration}
          </p>
        )}
        {caseStudy.case_highlights && (
          <ul className="mt-2 list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-zinc-400">
            {caseStudy.case_highlights.split(";").filter(h => h.trim()).map((highlight, idx) => (
              <li key={idx}>{highlight.trim()}</li>
            ))}
          </ul>
        )}
        {safeCaseStudyUrl ? (
          <a
            href={safeCaseStudyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-sm text-gray-600 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            View Case Study →
          </a>
        ) : null}
      </div>
    );
  }

  // Edit mode
  if (!isEditing) {
    return (
      <div className="rounded-md border border-orange-100 bg-orange-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h4 className="font-medium text-black dark:text-zinc-50">
              {caseStudy.case_name}
            </h4>
            {caseStudy.case_summary && (
              <p className="mt-1 text-sm text-gray-600 dark:text-zinc-400">
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
          <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300">
            Case Name <span className="text-red-600 dark:text-red-400">*</span>
          </label>
          <input
            type="text"
            value={caseName}
            onChange={(e) => setCaseName(e.target.value)}
            maxLength={50}
            className={`mt-1 block w-full rounded-md border px-3 py-2 text-black placeholder-zinc-400 shadow-sm focus:outline-none focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:ring-zinc-600 sm:text-sm ${
              !caseName.trim() ? "border-red-300 focus:border-red-500 dark:border-red-700" : "border-orange-200 focus:border-orange-500 dark:focus:border-zinc-600"
            }`}
            placeholder="Enter case name"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">
            {caseName.length}/50 characters
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300">
            Case Summary
          </label>
          <textarea
            value={caseSummary}
            onChange={(e) => setCaseSummary(e.target.value)}
            maxLength={100}
            rows={3}
                className="mt-1 block w-full rounded-md border border-orange-200 px-3 py-2 text-gray-800 placeholder-gray-400 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-orange-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-zinc-600 dark:focus:ring-zinc-600 sm:text-sm"
            placeholder="Enter case summary"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">
            {caseSummary.length}/100 characters
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300">
            Case Duration <span className="text-red-600 dark:text-red-400">*</span>
          </label>
          <input
            type="text"
            value={caseDuration}
            onChange={(e) => setCaseDuration(e.target.value)}
            maxLength={50}
            className={`mt-1 block w-full rounded-md border bg-white px-3 py-2 text-black placeholder-zinc-400 shadow-sm focus:outline-none dark:bg-zinc-800 dark:text-zinc-50 sm:text-sm ${
              !caseDuration.trim()
                ? "border-red-300 focus:border-red-500 focus:ring-red-500 dark:border-red-700"
                : "border-zinc-300 focus:border-zinc-500 focus:ring-zinc-500 dark:border-zinc-700 dark:focus:border-zinc-600 dark:focus:ring-zinc-600"
            }`}
            placeholder="e.g., 12th Sep, 2024 to 13th Nov, 2024"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">
            {caseDuration.length}/50 characters
          </p>
          {!caseDuration.trim() ? (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
              Case duration is required
            </p>
          ) : null}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300">
            Case Highlights <span className="text-red-600 dark:text-red-400">*</span>
          </label>
          <div className="mt-2 space-y-2">
            {caseHighlights.map((highlight, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={highlight}
                  onChange={(e) => handleHighlightChange(index, e.target.value)}
                  className="flex-1 rounded-md border border-orange-200 bg-white px-3 py-2 text-gray-800 placeholder-gray-400 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-orange-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-zinc-600 dark:focus:ring-zinc-600 sm:text-sm"
                  placeholder={`Highlight ${index + 1}`}
                />
                {caseHighlights.length > 1 && (
                  <button
                    onClick={() => handleRemoveHighlight(index)}
                    className="flex items-center justify-center rounded-md border border-orange-200 bg-white p-2 text-gray-600 transition-colors hover:bg-orange-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={handleAddHighlight}
              className="flex items-center gap-2 rounded-md border border-orange-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-orange-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
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
          <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300">
            Case Study URL
          </label>
          <input
            type="url"
            value={caseStudyUrl}
            onChange={(e) => setCaseStudyUrl(e.target.value)}
            maxLength={500}
            className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-black placeholder-zinc-400 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-zinc-600 dark:focus:ring-zinc-600 sm:text-sm"
            placeholder="https://example.com"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={!caseName.trim() || !caseDuration.trim() || !caseHighlights.some(h => h.trim())}
            className="rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
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
  attachedCaseStudies: initialAttachedCaseStudies,
  hasActiveCampaign,
  isPublishable: initialIsPublishable,
}: CampaignOverviewClientProps) {
  // UX terminology: visible labels use Application/Pitch while internal entities remain Project/Campaign.
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isDraft = initialCampaign.campaign_status === "DRAFT";
  const isEditMode = isDraft && !project.is_archived;

  const sageLinkExperiencesPulse = useCampaignLinkExperiencesSagePulse(pathname);

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
  const [attachedCaseStudies, setAttachedCaseStudies] = useState<AttachedExperienceCaseStudy[]>(
    initialAttachedCaseStudies
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ExperienceSearchResult[]>([]);
  /** When catalog has 10+ items, last short-query (0–2 chars) response — shown under empty search results. */
  const [recentExperienceFallback, setRecentExperienceFallback] = useState<ExperienceSearchResult[]>([]);
  const [totalExperienceCount, setTotalExperienceCount] = useState<number>(0);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTouched, setSearchTouched] = useState(false);
  const [isMutatingAttach, setIsMutatingAttach] = useState(false);

  // Check if any mandatory fields are empty (including services)
  const hasEmptyMandatoryFields = 
    !clientName.trim() ||
    !clientSummary.trim() ||
    (!ctaScheduleMeeting?.trim() && !ctaMailto?.trim() && !ctaLinkedin?.trim() && !ctaPhone?.trim()) ||
    attachedCaseStudies.length === 0;

  useEffect(() => {
    setIsPublishable(!hasEmptyMandatoryFields);
  }, [hasEmptyMandatoryFields]);

  useEffect(() => {
    emitStudioCampaignWriteMode(isEditMode);
    return () => emitStudioCampaignWriteMode(false);
  }, [isEditMode]);

  useEffect(() => {
    if (!pathname) return;
    if (/^\/dashboard\/projects\/[^/]+\/campaigns\/[^/]+$/.test(pathname)) {
      try {
        sessionStorage.setItem(SAGE_ONBOARDING_CAMPAIGN_EDITOR_PATH_KEY, pathname);
        const segment = pathname.match(/^\/dashboard\/projects\/([^/]+)/);
        if (segment?.[1]) {
          sessionStorage.setItem(
            SAGE_ONBOARDING_PROJECT_EDITOR_PATH_KEY,
            `/dashboard/projects/${segment[1]}`
          );
        }
      } catch {
        // ignore
      }
    }
  }, [pathname]);

  useLayoutEffect(() => {
    const hl = searchParams.get("sage_highlight");
    if (!hl?.startsWith("campaign.form.") || !isEditMode) return;
    switch (hl) {
      case "campaign.form.title":
        setClientName((v) => (v.trim() ? v : "Hire Me for XYZ Role"));
        break;
      case "campaign.form.summary":
        setClientSummary((v) => (v.trim() ? v : "Summary about me"));
        break;
      case "campaign.form.call_to_action":
        setCtaMailto((v) => (v.trim() ? v : "youremail@example.com"));
        break;
      default:
        break;
    }
  }, [searchParams, isEditMode]);

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

  // Note: Removed beforeunload handler to prevent browser reload warning
  // Instead, we use toast notifications to communicate save status

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

  const fetchExperienceResults = useCallback(async (query: string) => {
    setError(null);
    setIsSearching(true);
    try {
      const safeQ = sanitizeSearchQuery(query);
      const res = await fetch(
        `/api/campaigns/${campaign.campaign_id}/case-studies/search?q=${encodeURIComponent(safeQ)}`
      );
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || "Failed to search experiences");
      }
      const tc = Number(payload.totalCount) || 0;
      const list = (payload.caseStudies || []) as ExperienceSearchResult[];
      setTotalExperienceCount(tc);
      setSearchResults(list);
      if (safeQ.length < 3 && tc > 10) {
        setRecentExperienceFallback(list);
      }
      setSearchTouched(true);
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : "Failed to search experiences");
    } finally {
      setIsSearching(false);
    }
  }, [campaign.campaign_id]);

  useEffect(() => {
    void fetchExperienceResults("");
  }, [fetchExperienceResults]);

  useEffect(() => {
    if (totalExperienceCount <= 10) {
      return;
    }

    const q = searchQuery.trim();
    if (q.length < 3) {
      setSearchTouched(true);
      void fetchExperienceResults(q);
      return;
    }

    const timer = setTimeout(() => {
      void fetchExperienceResults(q);
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, totalExperienceCount, fetchExperienceResults]);

  const handleAttachExperience = async (candidate: ExperienceSearchResult) => {
    if (!isUuid(candidate.case_id) || !isUuid(candidate.service_class_id)) {
      setError("Invalid experience selection");
      return;
    }
    if (attachedCaseStudies.some((entry) => entry.case_id === candidate.case_id)) {
      return;
    }

    setIsMutatingAttach(true);
    setError(null);
    try {
      const orderIndex = attachedCaseStudies.length;
      const res = await fetch(`/api/campaigns/${campaign.campaign_id}/case-studies/attach`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId: candidate.case_id,
          attachedServiceClassId: candidate.service_class_id,
          orderIndex,
        }),
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || "Failed to attach case study");
      }

      setAttachedCaseStudies((prev) => [
        ...prev,
        {
          case_id: candidate.case_id,
          attached_service_class_id: candidate.service_class_id,
          service_class_name: candidate.service_class_name,
          case_name: candidate.case_name,
          case_summary: candidate.case_summary,
          case_duration: candidate.case_duration,
          display_year: candidate.display_year,
          case_highlights: candidate.case_highlights,
          case_study_url: candidate.case_study_url,
          created_at: candidate.created_at,
          order_index: orderIndex,
        },
      ]);
    } catch (attachError) {
      setError(attachError instanceof Error ? attachError.message : "Failed to attach case study");
    } finally {
      setIsMutatingAttach(false);
    }
  };

  const handleDetachExperience = async (caseId: string) => {
    if (!isUuid(caseId)) {
      setError("Invalid case id");
      return;
    }
    setIsMutatingAttach(true);
    setError(null);
    try {
      const res = await fetch(`/api/campaigns/${campaign.campaign_id}/case-studies/attach`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId }),
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || "Failed to detach case study");
      }
      setAttachedCaseStudies((prev) =>
        prev
          .filter((entry) => entry.case_id !== caseId)
          .map((entry, index) => ({ ...entry, order_index: index }))
      );
    } catch (detachError) {
      setError(detachError instanceof Error ? detachError.message : "Failed to detach case study");
    } finally {
      setIsMutatingAttach(false);
    }
  };

  const handleSave = async (opts?: { quiet?: boolean }): Promise<boolean> => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // Save campaign updates
      const updates = {
        campaign_name: sanitizePlainTextLine(campaignName, 25),
        campaign_structure: {
          client_name: sanitizePlainTextLine(clientName, 25),
          client_summary: sanitizePlainTextMultiline(clientSummary, 400),
        },
        cta_config: {
          ...(ctaScheduleMeeting.trim() && {
            schedule_meeting: sanitizePlainTextLine(ctaScheduleMeeting, 500),
          }),
          ...(ctaMailto.trim() && { mailto: sanitizePlainTextLine(ctaMailto, 500) }),
          ...(ctaLinkedin.trim() && { linkedin: sanitizePlainTextLine(ctaLinkedin, 500) }),
          ...(ctaPhone.trim() && { phone: sanitizePlainTextLine(ctaPhone, 50) }),
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
        setError(campaignData.error || "Failed to save pitch");
        setIsSaving(false);
        return false;
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
          return false;
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
      // Only proceed after services are saved (serviceIdMap is populated)
      if (pendingCaseStudyOps.length > 0) {
        // Map temp service IDs to real IDs using the map
        // Filter out any operations with temp IDs
        const mappedOps = pendingCaseStudyOps.map(op => {
          if (op.serviceId?.startsWith("temp-")) {
            const realServiceId = serviceIdMap.get(op.serviceId);
            if (realServiceId && !realServiceId.startsWith("temp-")) {
              return { ...op, serviceId: realServiceId };
            }
            // If service wasn't found in map or is still a temp ID, skip it
            return null;
          }
          // If serviceId exists and is not a temp ID, keep it
          if (op.serviceId && !op.serviceId.startsWith("temp-")) {
            return op;
          }
          // Skip if serviceId is missing or is a temp ID
          return null;
        }).filter((op): op is NonNullable<typeof op> => op !== null && !!op.serviceId && !op.serviceId.startsWith("temp-"));

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
            return false;
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

      // Update state instead of reloading page
      // Clear pending operations
      setPendingServiceOps([]);
      setPendingCaseStudyOps([]);
      
      // Update campaign state with saved data
      setCampaign({
        ...campaign,
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
      });
      
      if (!opts?.quiet) {
        setSuccess("Pitch saved successfully!");
        setTimeout(() => setSuccess(null), 3000);
      }
      setIsSaving(false);
      return true;
    } catch (error) {
      setError("An unexpected error occurred. Please try again.");
      setIsSaving(false);
      // Auto-hide error message after 5 seconds
      setTimeout(() => setError(null), 5000);
      return false;
    }
  };

  const handleCreateNewExperience = async () => {
    if (!isEditMode || project.is_archived) return;
    const ok = await handleSave({ quiet: true });
    if (!ok) return;
    const returnTo = encodeURIComponent(
      `/dashboard/projects/${project.project_id}/campaigns/${campaign.campaign_id}`
    );
    router.push(`/dashboard/experience/new?returnTo=${returnTo}`);
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
            throw new Error(campaignData.error || "Failed to save pitch");
          }

          // Save services and case studies if needed
          if (pendingServiceOps.length > 0 || pendingCaseStudyOps.length > 0) {
            // Build service ID map for case study operations
            const publishServiceIdMap = new Map<string, string>();
            
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

              const servicesData = await servicesRes.json();
              // Build service ID map from temp IDs to real IDs
              servicesData.results?.forEach((result: any) => {
                if (result.type === "create" && result.id && result.service) {
                  publishServiceIdMap.set(result.id, result.service.client_service_id);
                }
              });
            }

            // Save case studies - map temp service IDs to real IDs
            if (pendingCaseStudyOps.length > 0) {
              // Map temp service IDs to real IDs using the map
              // Filter out any operations with temp IDs
              const mappedPublishOps = pendingCaseStudyOps.map(op => {
                if (op.serviceId?.startsWith("temp-")) {
                  const realServiceId = publishServiceIdMap.get(op.serviceId);
                  if (realServiceId && !realServiceId.startsWith("temp-")) {
                    return { ...op, serviceId: realServiceId };
                  }
                  // If service wasn't found in map or is still a temp ID, skip it
                  return null;
                }
                // If serviceId exists and is not a temp ID, keep it
                if (op.serviceId && !op.serviceId.startsWith("temp-")) {
                  return op;
                }
                // Skip if serviceId is missing or is a temp ID
                return null;
              }).filter((op): op is NonNullable<typeof op> => op !== null && !!op.serviceId && !op.serviceId.startsWith("temp-"));

              if (mappedPublishOps.length > 0) {
                const caseStudiesRes = await fetch(`/api/campaigns/${campaign.campaign_id}/case-studies`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ operations: mappedPublishOps }),
                });

                if (!caseStudiesRes.ok) {
                  const caseStudiesData = await caseStudiesRes.json();
                  throw new Error(caseStudiesData.error || "Failed to save case studies");
                }
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
        setError(data.error || "Failed to publish pitch");
        setIsPublishing(false);
        return;
      }

      setSuccess(data.message || "Pitch published successfully!");
      setIsPublishing(false);

      const projectPath = `/dashboard/projects/${project.project_id}`;
      const campaignPath = `${projectPath}/campaigns/${campaign.campaign_id}`;

      dispatchSagePrimaryActionDone("campaign.form.publish", {
        sageSessionProjectPath: projectPath,
        sageSessionCampaignPath: campaignPath,
        onUnconsumed: () => {
          void router.refresh();
          window.setTimeout(() => {
            router.push(projectPath);
          }, 1500);
        },
      });
    } catch (error: any) {
      setError(error.message || "An unexpected error occurred");
      setIsPublishing(false);
    }
  };

  const fetchAvailableCampaigns = async () => {
    try {
      // Use cache-busting to ensure fresh data
      const res = await fetch(`/api/projects/${project.project_id}/campaigns?t=${Date.now()}`);
      const data = await res.json();
      
      if (res.ok) {
        const allCampaigns = data.campaigns || [];
        const active = data.activeCampaign || null;
        
        // For PAUSED campaigns, include the current campaign in available list (for "Make Active")
        // For DRAFT campaigns, include the current campaign in available list (for "Switch to Current")
        // For other cases, filter out the current campaign
        const available = allCampaigns.filter((c: CampaignData) => {
          // Only include DRAFT or PAUSED campaigns
          if (c.campaign_status !== "DRAFT" && c.campaign_status !== "PAUSED") {
            return false;
          }
          
          // If current campaign is PAUSED or DRAFT, include it in the list
          if ((campaign.campaign_status === "PAUSED" || campaign.campaign_status === "DRAFT") && 
              c.campaign_id === campaign.campaign_id) {
            return true;
          }
          
          // For all other cases, exclude the current campaign
          return c.campaign_id !== campaign.campaign_id;
        });
        
        setAvailableCampaigns(available);
        setCurrentActiveCampaign(active);
        
        // Pre-select the current campaign if it's PAUSED (for "Make Active") or DRAFT (for "Switch to Current")
        if (campaign.campaign_status === "PAUSED" || campaign.campaign_status === "DRAFT") {
          setSelectedTargetCampaignId(campaign.campaign_id);
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
      setError("Please select a pitch to switch to");
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
        setError(data.error || "Failed to switch pitch");
        setIsSwitching(false);
        return;
      }

      setSuccess(data.message || "Pitch switched successfully!");
      setIsSwitchModalOpen(false);
      
      // Revalidate server data before navigation
      router.refresh();
      
      // Redirect to project overview after a short delay
      setTimeout(() => {
        router.push(`/dashboard/projects/${project.project_id}`);
      }, 1500);
    } catch (error: any) {
      setError(error.message || "An unexpected error occurred");
      setIsSwitching(false);
    }
  };

  // Back to project overview; draft edits with unsaved changes get a confirmation first
  const handleBackClick = useCallback(() => {
    if (isEditMode && hasUnsavedChanges) {
      setShowUnsavedWarning(true);
      return;
    }
    router.replace(`/dashboard/projects/${project.project_id}`);
  }, [isEditMode, hasUnsavedChanges, router, project.project_id]);

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
      return "Switch Pitch";
    }
    if (campaign.campaign_status === "DRAFT") {
      return hasActiveCampaign ? "Switch to Current" : "Publish Pitch";
    }
    if (campaign.campaign_status === "PAUSED") {
      return "Make Active";
    }
    return "Switch Pitch";
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

  const runPrimaryCTA = () => {
    if (campaign.campaign_status === "ACTIVE") {
      handleSwitchCampaign();
    } else if (campaign.campaign_status === "PAUSED") {
      handleSwitchCampaign();
    } else if (campaign.campaign_status === "DRAFT" && hasActiveCampaign) {
      handleSwitchCampaign();
    } else {
      void handlePublish();
    }
  };

  const primaryCTADisabled =
    (campaign.campaign_status === "DRAFT" && !hasActiveCampaign && !isPublishable) ||
    isPublishing ||
    isSwitching ||
    project.is_archived;

  // For view mode: show first 4 lines, then "See more" if longer
  const currentSummary = isEditMode ? clientSummary : (campaign.campaign_structure.client_summary || "");
  const summaryLines = currentSummary.split("\n");
  const shouldShowMore = summaryLines.length > 4;
  const displaySummary = showMoreSummary || !shouldShowMore 
    ? currentSummary 
    : summaryLines.slice(0, 4).join("\n");

  // Analytics hook - only fetch for ACTIVE/PAUSED campaigns
  const shouldShowAnalytics = campaign.campaign_status === "ACTIVE" || campaign.campaign_status === "PAUSED";
  const { analytics, isLoading: isAnalyticsLoading, error: analyticsError, refresh: refreshAnalytics } = useCampaignAnalytics(
    shouldShowAnalytics ? campaign.campaign_id : ""
  );

  const ctaFieldShellClass =
    "mt-1 flex rounded-md border border-zinc-300 bg-white shadow-sm focus-within:border-zinc-500 focus-within:ring-1 focus-within:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:focus-within:border-zinc-600 dark:focus-within:ring-zinc-600";
  const ctaFieldIconWrapClass =
    "flex shrink-0 items-center self-stretch border-r border-zinc-200 px-3 dark:border-zinc-600";
  const ctaFieldInnerInputClass =
    "min-w-0 flex-1 border-0 bg-transparent px-3 py-2 text-sm text-black placeholder-zinc-400 focus:outline-none focus:ring-0 dark:text-zinc-50";

  const showNoSearchMatches =
    totalExperienceCount > 10 &&
    searchTouched &&
    searchQuery.trim().length >= 3 &&
    searchResults.length === 0 &&
    !isSearching;

  return (
    <div className={isEditMode ? "space-y-6 pb-28 lg:pb-0" : "space-y-6"}>
      <div className={isEditMode ? "flex items-center justify-between gap-3" : "flex items-center gap-3"}>
        <StudioBackButton onClick={handleBackClick} />
        {isEditMode ? (
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={isSaving || project.is_archived}
            className="hidden rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 lg:inline-flex dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            {isSaving ? "Saving..." : "Save Pitch"}
          </button>
        ) : null}
      </div>

      {/* Header Section */}
      <div className="rounded-lg border border-orange-100 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {isEditMode ? (
              <input
                type="text"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                maxLength={25}
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-2xl font-semibold text-black placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-zinc-600 dark:focus:ring-zinc-600"
                placeholder="Pitch Name"
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
              <span className="text-sm text-gray-600 dark:text-zinc-400">
                Created {new Date(campaign.created_at).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })}
              </span>
              {project.project_url && campaign.campaign_status === "ACTIVE" && (
                <span className="text-sm text-gray-600 dark:text-zinc-400">
                  {project.project_url}
                </span>
              )}
            </div>
          </div>
        </div>
        {/* Toast notifications moved to fixed position */}
      </div>

      {/* Performance Section - Only for ACTIVE/PAUSED pitches */}
      {shouldShowAnalytics && (
        <div className="rounded-lg border border-orange-100 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-black dark:text-zinc-50">Performance</h3>
            <button
              onClick={refreshAnalytics}
              disabled={isAnalyticsLoading}
              className="flex items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              <RefreshCw className={`h-4 w-4 ${isAnalyticsLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
          <AnalyticsCards
            analytics={analytics}
            isLoading={isAnalyticsLoading}
            error={analyticsError}
          />
        </div>
      )}

      {/* Add pitch details */}
      <div className="rounded-lg border border-orange-100 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between lg:items-center">
          <h3 className="text-lg font-semibold text-black dark:text-zinc-50">Add Pitch Details</h3>
          {shouldShowPrimaryCTA() && (
            <button
              type="button"
              data-sage-target="campaign-publish"
              onClick={runPrimaryCTA}
              disabled={primaryCTADisabled}
              className={`rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200 ${
                isEditMode ? "hidden lg:inline-flex" : "inline-flex"
              }`}
            >
              {(isPublishing || isSwitching) ? "Processing..." : getPrimaryCTALabel()}
            </button>
          )}
        </div>

        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-8 xl:gap-10">
          <div className="min-w-0 flex-1 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300">
                Campaign Title <span className="text-red-600 dark:text-red-400">*</span>
              </label>
              {isEditMode ? (
                <input
                  id="campaign-title"
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  maxLength={25}
                  className={`mt-1 block w-full rounded-md border px-3 py-2 text-black placeholder-zinc-400 shadow-sm focus:outline-none focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:ring-zinc-600 sm:text-sm ${
                    !clientName.trim() ? "border-red-300 focus:border-red-500 dark:border-red-700" : "border-zinc-300 focus:border-zinc-500 dark:focus:border-zinc-600"
                  }`}
                  placeholder="Enter campaign title"
                />
              ) : (
                <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-50">
                  {campaign.campaign_structure.client_name || <span className="text-zinc-400">Not set</span>}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300">
                Campaign Summary <span className="text-red-600 dark:text-red-400">*</span>
              </label>
              {isEditMode ? (
                <div className="relative mt-1">
                  <textarea
                    id="campaign-summary"
                    value={clientSummary}
                    onChange={(e) => setClientSummary(e.target.value)}
                    maxLength={400}
                    rows={4}
                    className={`block w-full rounded-md border px-3 py-2 pb-8 text-black placeholder-zinc-400 shadow-sm focus:outline-none focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:ring-zinc-600 sm:text-sm ${
                      !clientSummary.trim() ? "border-red-300 focus:border-red-500 dark:border-red-700" : "border-zinc-300 focus:border-zinc-500 dark:focus:border-zinc-600"
                    }`}
                    placeholder="Enter campaign summary"
                  />
                  <p className="pointer-events-none absolute bottom-2 left-3 text-xs text-gray-500 dark:text-zinc-400">
                    {clientSummary.length}/400 characters
                  </p>
                </div>
              ) : (
                <div className="mt-1">
                  <p className="text-sm text-zinc-900 dark:text-zinc-50 whitespace-pre-line">
                    {displaySummary || <span className="text-zinc-400">Not set</span>}
                  </p>
                  {shouldShowMore && !showMoreSummary && (
                    <button
                      type="button"
                      onClick={() => setShowMoreSummary(true)}
                      className="mt-2 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                    >
                      See more
                    </button>
                  )}
                  {shouldShowMore && showMoreSummary && (
                    <button
                      type="button"
                      onClick={() => setShowMoreSummary(false)}
                      className="mt-2 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                    >
                      See less
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Lead contact & CTA */}
          <div className="min-w-0 flex-1 space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-black dark:text-zinc-50">
                How shall recruiters reach you?
              </h3>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                CTA configuration <span className="text-red-600 dark:text-red-400">*</span>
                <span className="ml-1 text-xs font-normal">(at least one required)</span>
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-600 dark:text-zinc-400">
                  Schedule Meeting URL
                </label>
                {isEditMode ? (
                  <div className={ctaFieldShellClass}>
                    <span className={ctaFieldIconWrapClass}>
                      <Calendar className="h-4 w-4 text-zinc-400" aria-hidden />
                    </span>
                    <input
                      type="url"
                      value={ctaScheduleMeeting}
                      onChange={(e) => setCtaScheduleMeeting(e.target.value)}
                      className={ctaFieldInnerInputClass}
                      placeholder="https://calendly.com/..."
                    />
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-50">
                    {campaign.cta_config.schedule_meeting || <span className="text-zinc-400">Not set</span>}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-zinc-400">
                  Email (mailto)
                </label>
                {isEditMode ? (
                  <div className={ctaFieldShellClass}>
                    <span className={ctaFieldIconWrapClass}>
                      <Mail className="h-4 w-4 text-zinc-400" aria-hidden />
                    </span>
                    <input
                      id="campaign-cta"
                      type="email"
                      value={ctaMailto}
                      onChange={(e) => setCtaMailto(e.target.value)}
                      className={ctaFieldInnerInputClass}
                      placeholder="email@example.com"
                    />
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-50">
                    {campaign.cta_config.mailto || <span className="text-zinc-400">Not set</span>}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-zinc-400">
                  LinkedIn URL
                </label>
                {isEditMode ? (
                  <div className={ctaFieldShellClass}>
                    <span className={ctaFieldIconWrapClass}>
                      <Linkedin className="h-4 w-4 text-zinc-400" aria-hidden />
                    </span>
                    <input
                      type="url"
                      value={ctaLinkedin}
                      onChange={(e) => setCtaLinkedin(e.target.value)}
                      className={ctaFieldInnerInputClass}
                      placeholder="https://linkedin.com/in/..."
                    />
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-50">
                    {campaign.cta_config.linkedin || <span className="text-zinc-400">Not set</span>}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-zinc-400">
                  Phone
                </label>
                {isEditMode ? (
                  <div className={ctaFieldShellClass}>
                    <span className={ctaFieldIconWrapClass}>
                      <Phone className="h-4 w-4 text-zinc-400" aria-hidden />
                    </span>
                    <input
                      type="tel"
                      value={ctaPhone}
                      onChange={(e) => setCtaPhone(e.target.value)}
                      className={ctaFieldInnerInputClass}
                      placeholder="+1234567890"
                    />
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-50">
                    {campaign.cta_config.phone || <span className="text-zinc-400">Not set</span>}
                  </p>
                )}
              </div>
            </div>
            {isEditMode && (
              <p
                className={`text-xs ${
                  !ctaScheduleMeeting?.trim() && !ctaMailto?.trim() && !ctaLinkedin?.trim() && !ctaPhone?.trim()
                    ? "text-red-600 dark:text-red-400"
                    : "text-zinc-500 dark:text-zinc-400"
                }`}
              >
                At least one CTA is required
              </p>
            )}
          </div>
        </div>

        {/* Experience Search and Attach */}
        <div
          id="campaign-link-experiences"
          className="scroll-mt-4 mt-8 border-t border-orange-100 pt-8 dark:border-zinc-800"
        >
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-black dark:text-zinc-50">
              Select and Add Experiences <span className="text-red-600 dark:text-red-400">*</span>
            </h3>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Search previously created experiences by title and attach them to this pitch.
            </p>
          </div>

          {isEditMode && totalExperienceCount > 10 ? (
            <div className="mb-6">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(clampSearchQueryInput(e.target.value))}
                maxLength={200}
                placeholder="Type at least 3 characters to search by title..."
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-black shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
              />
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                {isSearching
                  ? "Searching..."
                  : "Below: your 10 most recently added experiences. Type at least 3 characters to search by title."}
              </p>
            </div>
          ) : null}

          {totalExperienceCount > 10 && searchQuery.trim().length > 0 && searchQuery.trim().length < 3 ? (
            <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
              Keep typing to at least 3 characters to search.
            </p>
          ) : null}

          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-8">
            <div className="min-w-0 flex-1 space-y-6">
              {showNoSearchMatches ? (
                <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">No matching experiences found.</p>
                  {isEditMode ? (
                    <button
                      type="button"
                      onClick={() => void handleCreateNewExperience()}
                      disabled={isSaving}
                      className="mt-3 inline-flex items-center rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
                    >
                      {isSaving ? "Saving…" : "Create New Experience"}
                    </button>
                  ) : null}
                  {recentExperienceFallback.length > 0 ? (
                    <div className="mt-6 space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        Recently added
                      </p>
                      {recentExperienceFallback.map((result) => {
                        const alreadyAttached = attachedCaseStudies.some(
                          (entry) => entry.case_id === result.case_id
                        );
                        return (
                          <ExperienceSearchPickRow
                            key={result.case_id}
                            result={result}
                            isEditMode={isEditMode}
                            isMutatingAttach={isMutatingAttach}
                            alreadyAttached={alreadyAttached}
                            sageOnboardingPulse={sageLinkExperiencesPulse}
                            onAttach={(r) => void handleAttachExperience(r)}
                            onDetach={(caseId) => void handleDetachExperience(caseId)}
                          />
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              ) : null}
              {searchResults.length > 0 ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      {totalExperienceCount <= 10
                        ? "Available Experiences"
                        : searchQuery.trim().length >= 3
                          ? "Search Results"
                          : "Recently added"}
                    </p>
                    {isEditMode ? (
                      <p className="mt-1 max-w-prose text-[11px] font-normal normal-case leading-snug tracking-normal text-zinc-500 dark:text-zinc-400 lg:hidden">
                        Tap a card to add it to this pitch. Cards with a blue outline are already attached—tap again to
                        remove them.
                      </p>
                    ) : null}
                  </div>
                  {searchResults.map((result) => {
                    const alreadyAttached = attachedCaseStudies.some((entry) => entry.case_id === result.case_id);
                    return (
                      <ExperienceSearchPickRow
                        key={result.case_id}
                        result={result}
                        isEditMode={isEditMode}
                        isMutatingAttach={isMutatingAttach}
                        alreadyAttached={alreadyAttached}
                        sageOnboardingPulse={sageLinkExperiencesPulse}
                        onAttach={(r) => void handleAttachExperience(r)}
                        onDetach={(caseId) => void handleDetachExperience(caseId)}
                      />
                    );
                  })}
                </div>
              ) : null}
            </div>

            <div className="min-w-0 flex-1 space-y-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Attached to Pitch
                </p>
                {isEditMode ? (
                  <p className="mt-1 max-w-prose text-[11px] font-normal normal-case leading-snug tracking-normal text-zinc-500 dark:text-zinc-400 lg:hidden">
                    Tap a card to remove it from this pitch. The border highlights red when you hover or press.
                  </p>
                ) : null}
              </div>
              {attachedCaseStudies.length === 0 ? (
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  No experience case studies attached yet.
                </p>
              ) : (
                attachedCaseStudies
                  .slice()
                  .sort((a, b) => a.order_index - b.order_index)
                  .map((entry) => (
                    <div
                      key={entry.case_id}
                      className={`relative rounded-md border border-orange-100 bg-orange-50 p-4 dark:border-zinc-800 dark:bg-zinc-900 ${
                        isEditMode
                          ? "max-lg:transition-colors max-lg:hover:border-red-500 max-lg:hover:bg-red-50 dark:max-lg:hover:border-red-600 dark:max-lg:hover:bg-red-950/35"
                          : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1 pr-2">
                          <p className="text-xs font-semibold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                            {entry.service_class_name}
                          </p>
                          <h4 className="mt-1 text-sm font-semibold text-black dark:text-zinc-50">{entry.case_name}</h4>
                          {entry.case_summary ? (
                            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{entry.case_summary}</p>
                          ) : null}
                        </div>
                        {isEditMode ? (
                          <button
                            type="button"
                            onClick={() => void handleDetachExperience(entry.case_id)}
                            disabled={isMutatingAttach}
                            className="hidden rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 lg:inline-flex dark:border-red-800 dark:bg-zinc-800 dark:text-red-400 dark:hover:bg-red-900/20"
                          >
                            Remove
                          </button>
                        ) : null}
                      </div>
                      {isEditMode ? (
                        <button
                          type="button"
                          disabled={isMutatingAttach}
                          aria-label={`Remove ${entry.case_name} from campaign`}
                          className="absolute inset-0 z-10 cursor-pointer rounded-md border-0 bg-transparent p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 lg:hidden"
                          onClick={() => void handleDetachExperience(entry.case_id)}
                        />
                      ) : null}
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      </div>

      {isEditMode && shouldShowPrimaryCTA() && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-orange-100 bg-white/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/95 lg:hidden">
          <div className="mx-auto flex max-w-5xl gap-3">
            <button
              type="button"
              data-sage-target="campaign-publish"
              onClick={runPrimaryCTA}
              disabled={primaryCTADisabled}
              className="min-w-0 flex-[1.35] rounded-md bg-orange-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
            >
              {(isPublishing || isSwitching) ? "Processing..." : getPrimaryCTALabel()}
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={isSaving || project.is_archived}
              className="min-w-0 flex-1 rounded-md border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      )}

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
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300">
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
              <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">
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
              className="rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
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
              className="rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
            >
              Save
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Switch Pitch Modal */}
      <Dialog open={isSwitchModalOpen} onOpenChange={(open) => {
        setIsSwitchModalOpen(open);
        if (!open) {
          setSelectedTargetCampaignId("");
          setError(null);
          setIsSwitching(false); // Reset switching state when modal closes
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Switch Pitch</DialogTitle>
            <DialogDescription>
              {currentActiveCampaign 
                ? `Switch from "${currentActiveCampaign.campaign_name}" to another pitch. The current active pitch will be paused.`
                : "Select a pitch to activate. This will make it the active pitch for this application."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {currentActiveCampaign && (
              <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Current Active Pitch:
                </p>
                <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-50">
                  {currentActiveCampaign.campaign_name}
                </p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300">
                Switch To Pitch <span className="text-red-600 dark:text-red-400">*</span>
              </label>
              {availableCampaigns.length === 0 ? (
                <p className="mt-2 text-sm text-gray-600 dark:text-zinc-400">
                  No other pitches available to switch to.
                </p>
              ) : (
                <select
                  value={selectedTargetCampaignId}
                  onChange={(e) => setSelectedTargetCampaignId(e.target.value)}
                  disabled={isSwitching}
                  className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-black shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-zinc-600 dark:focus:ring-zinc-600 sm:text-sm"
                >
                  <option value="">Select a pitch...</option>
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
                  <strong>Warning:</strong> This will atomically switch pitches. The current active pitch will be paused and the selected pitch will become active. The application URL will remain unchanged.
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
                setIsSwitching(false); // Reset switching state on cancel
              }}
              className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmSwitch}
              disabled={isSwitching || !selectedTargetCampaignId || availableCampaigns.length === 0}
              className="rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
            >
              {isSwitching ? "Switching..." : "Confirm Switch"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toast notifications: vertical offset clears Studio header */}
      {error && (
        <div className="fixed right-4 top-24 z-50 rounded-lg bg-red-500 px-6 py-4 text-white shadow-lg transition-all lg:top-28">
          <div className="flex items-center gap-2">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-2 text-white hover:text-gray-200"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>
      )}
      {success && (
        <div className="fixed right-4 top-24 z-50 rounded-lg bg-green-500 px-6 py-4 text-white shadow-lg transition-all lg:top-28">
          <div className="flex items-center gap-2">
            <span>{success}</span>
            <button
              onClick={() => setSuccess(null)}
              className="ml-2 text-white hover:text-gray-200"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

