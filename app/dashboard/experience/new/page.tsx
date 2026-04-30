"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useLayoutEffect, useState } from "react";
import { Check, ChevronDown, Plus, X } from "lucide-react";
import {
  isUuid,
  sanitizeOptionalHttpUrl,
  sanitizePlainTextLine,
  sanitizePlainTextLinePreserveSpace,
  sanitizePlainTextMultiline,
} from "@/lib/utils/client-input-security";
import StudioBackButton from "@/components/dashboard/StudioBackButton";
import { dispatchSagePrimaryActionDone } from "@/lib/sage-onboarding-primary";

interface ServiceClassData {
  service_class_id: string;
  service_class_name: string;
  is_system_default: boolean;
  preset: string | null;
}

const inputClass =
  "block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50";

const highlightInputClass =
  "flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-zinc-600 dark:focus:ring-zinc-600";

const fieldLabelClass = "mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300";
const HIGHLIGHT_MAX_LEN = 200;
const MAX_HIGHLIGHTS = 25;
const normalizeForStorage = (value: string) => value.trim().toUpperCase();
const normalizeHighlightForStorage = (value: string) => value.toUpperCase();

/** Allow only in-app dashboard paths (e.g. return from campaign draft). */
function getSafeReturnToPath(raw: string | null): string | null {
  if (!raw) return null;
  let path: string;
  try {
    path = decodeURIComponent(raw);
  } catch {
    return null;
  }
  if (!path.startsWith("/dashboard/")) return null;
  if (path.includes("//")) return null;
  if (path.includes("?") || path.includes("#")) return null;
  return path;
}

function NewExperienceCaseStudyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnToPath = getSafeReturnToPath(searchParams.get("returnTo"));
  const [serviceClasses, setServiceClasses] = useState<ServiceClassData[]>([]);
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);
  const [selectedServiceClassId, setSelectedServiceClassId] = useState("");
  const [newServiceClassName, setNewServiceClassName] = useState("");
  const [isServiceClassPickerOpen, setIsServiceClassPickerOpen] = useState(false);
  const [customServiceClassDraft, setCustomServiceClassDraft] = useState("");
  const [isDesktopPicker, setIsDesktopPicker] = useState(false);
  const [caseName, setCaseName] = useState("");
  const [caseSummary, setCaseSummary] = useState("");
  const [caseDuration, setCaseDuration] = useState("");
  const [displayYear, setDisplayYear] = useState("");
  const [caseHighlights, setCaseHighlights] = useState<string[]>([""]);
  const [caseStudyUrl, setCaseStudyUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useLayoutEffect(() => {
    const hl = searchParams.get("sage_highlight");
    if (!hl?.startsWith("experience.form.") && hl !== "experience.form.save") return;
    switch (hl) {
      case "experience.form.display_year":
        setDisplayYear((y) => (y.trim() ? y : "2026"));
        break;
      case "experience.form.case_title":
        setCaseName((n) => (n.trim() ? n : "Sample Onboarding Experience"));
        break;
      case "experience.form.case_summary":
        setCaseSummary((s) => (s.trim() ? s : "Sample Case Summary for Onboarding Flow"));
        break;
      case "experience.form.highlights":
      case "experience.form.save":
        setCaseHighlights((prev) =>
          prev.length === 1 && !prev[0].trim() ? ["Add a Quantitative Impact here"] : prev
        );
        break;
      default:
        break;
    }
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoadingClasses(true);
      try {
        const res = await fetch("/api/experience/service-classes");
        const payload = await res.json();
        if (!res.ok) {
          throw new Error(payload.error || "Failed to load service classes");
        }
        if (!cancelled) {
          setServiceClasses(payload.serviceClasses || []);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load service classes");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingClasses(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const syncMode = () => setIsDesktopPicker(media.matches);
    syncMode();
    media.addEventListener("change", syncMode);
    return () => media.removeEventListener("change", syncMode);
  }, []);

  const handleAddHighlight = () => {
    setCaseHighlights((prev) => (prev.length >= MAX_HIGHLIGHTS ? prev : [...prev, ""]));
  };

  const handleRemoveHighlight = (index: number) => {
    setCaseHighlights((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  };

  const handleHighlightChange = (index: number, value: string) => {
    setCaseHighlights((prev) => {
      const next = [...prev];
      next[index] = sanitizePlainTextLinePreserveSpace(value, HIGHLIGHT_MAX_LEN);
      return next;
    });
  };

  const handleDisplayYearChange = (value: string) => {
    const digitsOnly = value.replace(/\D/g, "").slice(0, 4);
    setDisplayYear(digitsOnly);
  };

  const selectedServiceClass = serviceClasses.find(
    (serviceClass) => serviceClass.service_class_id === selectedServiceClassId
  );
  const serviceClassDisplayLabel = selectedServiceClass?.service_class_name || newServiceClassName.trim();

  const handleSelectExistingServiceClass = (serviceClassId: string) => {
    if (!isUuid(serviceClassId)) return;
    setError(null);
    setSelectedServiceClassId(serviceClassId);
    setNewServiceClassName("");
    setCustomServiceClassDraft("");
    setIsServiceClassPickerOpen(false);
  };

  const handleApplyCustomServiceClass = () => {
    const customValue = normalizeForStorage(sanitizePlainTextLine(customServiceClassDraft, 80));
    if (!customValue) {
      setError("Enter a custom service class name");
      return;
    }
    setError(null);
    setNewServiceClassName(customValue);
    setSelectedServiceClassId("");
    setIsServiceClassPickerOpen(false);
  };

  const handleSubmit = async () => {
    setError(null);

    if (!caseName.trim()) {
      setError("Case name is required");
      return;
    }
    if (caseSummary.trim().length > 700) {
      setError("Case summary must be at most 700 characters");
      return;
    }
    if (!/^\d{4}$/.test(displayYear.trim())) {
      setError("Display year must be a 4-digit number");
      return;
    }
    const yearNum = Number(displayYear.trim());
    if (yearNum < 1900 || yearNum > 2099) {
      setError("Display year must be between 1900 and 2099");
      return;
    }
    const joinedHighlights = caseHighlights
      .map((h) => normalizeHighlightForStorage(sanitizePlainTextLinePreserveSpace(h, HIGHLIGHT_MAX_LEN)))
      .filter(Boolean)
      .join(";");
    if (!joinedHighlights) {
      setError("At least one case highlight is required");
      return;
    }

    setIsSaving(true);
    try {
      let serviceClassId = selectedServiceClassId;
      if (serviceClassId && !isUuid(serviceClassId)) {
        throw new Error("Invalid service class selection");
      }
      const normalizedCustomServiceClass = normalizeForStorage(sanitizePlainTextLine(newServiceClassName, 80));
      const normalizedCaseName = normalizeForStorage(sanitizePlainTextLine(caseName, 75));
      const normalizedCaseSummary = normalizeForStorage(sanitizePlainTextMultiline(caseSummary, 700));
      const normalizedCaseDuration = normalizeForStorage(sanitizePlainTextLine(caseDuration, 255));
      const proofUrlRaw = caseStudyUrl.trim();
      const sanitizedProofUrl = sanitizeOptionalHttpUrl(caseStudyUrl);
      if (proofUrlRaw.length > 0 && !sanitizedProofUrl) {
        throw new Error("Proof URL must be https, or http only for localhost");
      }

      if (!serviceClassId && normalizedCustomServiceClass) {
        const serviceRes = await fetch("/api/experience/service-classes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ serviceClassName: normalizedCustomServiceClass }),
        });
        const servicePayload = await serviceRes.json();
        if (!serviceRes.ok) {
          throw new Error(servicePayload.error || "Failed to create service class");
        }
        serviceClassId = servicePayload.serviceClass.service_class_id;
        if (!isUuid(serviceClassId)) {
          throw new Error("Invalid service class from server");
        }
      }

      if (!serviceClassId) {
        throw new Error("Select an existing service class or create a new one");
      }

      const caseStudyRes = await fetch("/api/experience/case-studies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_class_id: serviceClassId,
          case_name: normalizedCaseName,
          case_summary: normalizedCaseSummary,
          ...(normalizedCaseDuration ? { case_duration: normalizedCaseDuration } : {}),
          display_year: yearNum,
          case_highlights: joinedHighlights,
          case_study_url: sanitizedProofUrl,
        }),
      });
      const caseStudyPayload = await caseStudyRes.json();
      if (!caseStudyRes.ok) {
        throw new Error(caseStudyPayload.error || "Failed to create case study");
      }

      dispatchSagePrimaryActionDone("experience.form.save");

      router.push(returnToPath ?? "/dashboard");
      router.refresh();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create experience");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl pb-24">
      <div className="mb-6">
        <StudioBackButton onClick={() => router.push(returnToPath ?? "/dashboard")} />
      </div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Create Experience Case Study</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Choose an existing service class or create one, then add your case study details. Take your time—everything
          saves when you submit.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-12">
          <div className="col-span-2 md:col-span-4">
            <label className={fieldLabelClass}>Service Class*</label>
            <button
              id="service_class"
              type="button"
              disabled={isLoadingClasses}
              onClick={() => {
                setCustomServiceClassDraft(newServiceClassName);
                setError(null);
                setIsServiceClassPickerOpen(true);
              }}
              className={`${inputClass} flex items-center justify-between text-left disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <span className={serviceClassDisplayLabel ? "text-zinc-900 dark:text-zinc-50" : "text-zinc-500 dark:text-zinc-400"}>
                {serviceClassDisplayLabel || "Select existing or add custom"}
              </span>
              <ChevronDown className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
            </button>
          </div>

          <div className="col-span-1 md:col-span-2">
            <label className={fieldLabelClass}>Display Year*</label>
            <input
              id="display_year"
              value={displayYear}
              onChange={(e) => handleDisplayYearChange(e.target.value)}
              maxLength={4}
              inputMode="numeric"
              pattern="\d{4}"
              placeholder="e.g., 2025"
              className={inputClass}
            />
          </div>

          <div className="col-span-2 md:col-span-3">
            <label className={fieldLabelClass}>Case Duration</label>
            <input
              value={caseDuration}
              onChange={(e) => setCaseDuration(e.target.value)}
              maxLength={255}
              placeholder="e.g., May 2025 to May 2026"
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className={fieldLabelClass}>Case Title*</label>
          <input
            id="case_title"
            value={caseName}
            onChange={(e) => setCaseName(e.target.value)}
            maxLength={75}
            className={inputClass}
          />
          <p className="mt-2 text-right text-xs text-zinc-500 dark:text-zinc-400">Live Character Count: {caseName.length}/75</p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <label className={fieldLabelClass}>Case Summary*</label>
            <div className="rounded-md border border-zinc-300 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-800">
              <textarea
                id="case_summary"
                rows={16}
                maxLength={700}
                value={caseSummary}
                onChange={(e) => setCaseSummary(e.target.value)}
                className="block w-full resize-none border-0 bg-transparent text-sm text-zinc-900 focus:outline-none focus:ring-0 dark:text-zinc-50"
                placeholder="Describe the case context, approach, and outcome."
              />
              <p className="mt-2 text-right text-xs text-zinc-500 dark:text-zinc-400">
                Live Character Count: {caseSummary.length}/700
              </p>
            </div>
          </div>

          <div className="space-y-5 lg:col-span-6">
            <div>
              <label className={fieldLabelClass}>Add a Proof URL - prototype or live product</label>
              <input
                id="prototype_link"
                value={caseStudyUrl}
                onChange={(e) => setCaseStudyUrl(e.target.value)}
                maxLength={500}
                placeholder="Case Study URL"
                className={inputClass}
              />
            </div>

            <div>
              <label className={fieldLabelClass}>
                Add Quantitative Impact as Highlights<span className="text-red-600 dark:text-red-400">*</span>
              </label>
              <div className="space-y-3">
                {caseHighlights.map((highlight, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      id={index === 0 ? "highlights" : undefined}
                      type="text"
                      value={highlight}
                      onChange={(e) => handleHighlightChange(index, e.target.value)}
                      maxLength={HIGHLIGHT_MAX_LEN}
                      className={highlightInputClass}
                      placeholder={`Highlight ${index + 1}`}
                    />
                    {caseHighlights.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => handleRemoveHighlight(index)}
                        className="flex shrink-0 items-center justify-center rounded-md border border-zinc-300 bg-white p-2 text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                        aria-label={`Remove highlight ${index + 1}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handleAddHighlight}
                  disabled={caseHighlights.length >= MAX_HIGHLIGHTS}
                  className="flex w-full items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                >
                  <Plus className="h-4 w-4" />
                  Add Highlight
                </button>
              </div>
              {!caseHighlights.some((h) => h.trim()) ? (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">Add at least one highlight</p>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {isServiceClassPickerOpen && (
        <div className="fixed inset-0 z-50" onClick={() => setIsServiceClassPickerOpen(false)}>
          <div className="absolute inset-0 bg-black/50" aria-hidden />
          <div
            className={
              isDesktopPicker
                ? "absolute left-1/2 top-1/2 w-full max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
                : "absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-2xl border border-zinc-200 bg-white p-4 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
            }
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Service class picker"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Choose or Add Service Class</h3>
              <button
                type="button"
                onClick={() => setIsServiceClassPickerOpen(false)}
                className="rounded-md px-2 py-1 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              >
                Close
              </button>
            </div>

            {serviceClasses.filter((sc) => sc.is_system_default === true).length > 0 && (
              <div className="mb-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Standard</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {serviceClasses
                    .filter((sc) => sc.is_system_default === true)
                    .map((sc) => (
                      <button
                        key={sc.service_class_id}
                        type="button"
                        onClick={() => handleSelectExistingServiceClass(sc.service_class_id)}
                        className="flex items-center justify-between rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                      >
                        <span>{sc.service_class_name}</span>
                        {selectedServiceClassId === sc.service_class_id && !newServiceClassName.trim() ? (
                          <Check className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                        ) : null}
                      </button>
                    ))}
                </div>
              </div>
            )}

            {serviceClasses.filter((sc) => sc.is_system_default !== true).length > 0 && (
              <div className="mb-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Custom</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {serviceClasses
                    .filter((sc) => sc.is_system_default !== true)
                    .map((sc) => (
                      <button
                        key={sc.service_class_id}
                        type="button"
                        onClick={() => handleSelectExistingServiceClass(sc.service_class_id)}
                        className="flex items-center justify-between rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                      >
                        <span>{sc.service_class_name}</span>
                        {selectedServiceClassId === sc.service_class_id && !newServiceClassName.trim() ? (
                          <Check className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                        ) : null}
                      </button>
                    ))}
                </div>
              </div>
            )}

            <div className="border-t border-zinc-200 pt-4 dark:border-zinc-700">
              <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Or add custom service class</label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  value={customServiceClassDraft}
                  onChange={(e) => setCustomServiceClassDraft(e.target.value)}
                  maxLength={80}
                  placeholder="Enter custom service class"
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={handleApplyCustomServiceClass}
                  disabled={!customServiceClassDraft.trim()}
                  className="rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Use Custom
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-10 flex flex-col gap-3 border-t border-zinc-200 pt-8 sm:flex-row sm:justify-end dark:border-zinc-800">
        <button
          type="button"
          onClick={() => router.push(returnToPath ?? "/dashboard")}
          className="inline-flex items-center justify-center rounded-md border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          Cancel
        </button>
        <button
          id="save-experience"
          type="button"
          onClick={handleSubmit}
          disabled={isSaving}
          className="rounded-md bg-orange-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? "Saving..." : "Save Experience"}
        </button>
      </div>
    </div>
  );
}

export default function NewExperienceCaseStudyPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl px-4 py-16 text-center text-sm text-zinc-500 dark:text-zinc-400">
          Loading…
        </div>
      }
    >
      <NewExperienceCaseStudyForm />
    </Suspense>
  );
}
