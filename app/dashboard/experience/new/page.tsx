"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";

interface ServiceClassData {
  service_class_id: string;
  service_class_name: string;
}

const inputClass =
  "mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50";

const highlightInputClass =
  "flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-zinc-600 dark:focus:ring-zinc-600";

export default function NewExperienceCaseStudyPage() {
  const router = useRouter();
  const [serviceClasses, setServiceClasses] = useState<ServiceClassData[]>([]);
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);
  const [selectedServiceClassId, setSelectedServiceClassId] = useState("");
  const [newServiceClassName, setNewServiceClassName] = useState("");
  const [caseName, setCaseName] = useState("");
  const [caseSummary, setCaseSummary] = useState("");
  const [caseDuration, setCaseDuration] = useState("");
  const [displayYear, setDisplayYear] = useState("");
  const [caseHighlights, setCaseHighlights] = useState<string[]>([""]);
  const [caseStudyUrl, setCaseStudyUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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

  const handleAddHighlight = () => {
    setCaseHighlights((prev) => [...prev, ""]);
  };

  const handleRemoveHighlight = (index: number) => {
    setCaseHighlights((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  };

  const handleHighlightChange = (index: number, value: string) => {
    setCaseHighlights((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleSubmit = async () => {
    setError(null);

    if (!caseName.trim()) {
      setError("Case name is required");
      return;
    }
    if (!caseDuration.trim()) {
      setError("Case duration is required");
      return;
    }
    if (!displayYear.trim() || Number.isNaN(Number(displayYear.trim()))) {
      setError("Display year is required");
      return;
    }
    const joinedHighlights = caseHighlights.map((h) => h.trim()).filter(Boolean).join(";");
    if (!joinedHighlights) {
      setError("At least one case highlight is required");
      return;
    }

    setIsSaving(true);
    try {
      let serviceClassId = selectedServiceClassId;
      if (!serviceClassId && newServiceClassName.trim()) {
        const serviceRes = await fetch("/api/experience/service-classes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ serviceClassName: newServiceClassName.trim() }),
        });
        const servicePayload = await serviceRes.json();
        if (!serviceRes.ok) {
          throw new Error(servicePayload.error || "Failed to create service class");
        }
        serviceClassId = servicePayload.serviceClass.service_class_id;
      }

      if (!serviceClassId) {
        throw new Error("Select an existing service class or create a new one");
      }

      const caseStudyRes = await fetch("/api/experience/case-studies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_class_id: serviceClassId,
          case_name: caseName.trim(),
          case_summary: caseSummary.trim(),
          case_duration: caseDuration.trim(),
          display_year: Number(displayYear.trim()),
          case_highlights: joinedHighlights,
          case_study_url: caseStudyUrl.trim(),
        }),
      });
      const caseStudyPayload = await caseStudyRes.json();
      if (!caseStudyRes.ok) {
        throw new Error(caseStudyPayload.error || "Failed to create case study");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create experience");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl pb-24">
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="text-sm font-medium text-orange-600 transition-colors hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300"
        >
          ← Back to Experience Canvas
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Create Experience Case Study</h1>
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
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Existing Service Class</label>
          <select
            value={selectedServiceClassId}
            onChange={(e) => setSelectedServiceClassId(e.target.value)}
            disabled={isLoadingClasses}
            className={inputClass}
          >
            <option value="">Select service class</option>
            {serviceClasses.map((sc) => (
              <option key={sc.service_class_id} value={sc.service_class_id}>
                {sc.service_class_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Or Create New Service Class</label>
          <input
            value={newServiceClassName}
            onChange={(e) => setNewServiceClassName(e.target.value)}
            maxLength={80}
            placeholder="e.g., Growth Marketing"
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Case Name</label>
          <input
            value={caseName}
            onChange={(e) => setCaseName(e.target.value)}
            maxLength={75}
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Case Duration (required)</label>
          <input
            value={caseDuration}
            onChange={(e) => setCaseDuration(e.target.value)}
            maxLength={255}
            placeholder="e.g., May 2025 to May 2026"
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Display Year (required)</label>
          <input
            value={displayYear}
            onChange={(e) => setDisplayYear(e.target.value)}
            maxLength={4}
            placeholder="e.g., 2025"
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Case Summary</label>
          <textarea
            rows={5}
            maxLength={150}
            value={caseSummary}
            onChange={(e) => setCaseSummary(e.target.value)}
            className={inputClass}
          />
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
              className="flex items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              <Plus className="h-4 w-4" />
              Add Highlight
            </button>
          </div>
          {!caseHighlights.some((h) => h.trim()) ? (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">Add at least one highlight</p>
          ) : null}
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Case Study URL</label>
          <input
            value={caseStudyUrl}
            onChange={(e) => setCaseStudyUrl(e.target.value)}
            placeholder="https://example.com"
            className={inputClass}
          />
        </div>
      </div>

      <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-zinc-200 pt-8 dark:border-zinc-800">
        <Link
          href="/dashboard"
          className="rounded-md border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          Cancel
        </Link>
        <button
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
