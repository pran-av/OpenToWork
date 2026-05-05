"use client";

import { useCallback, useEffect, useMemo, useState, Suspense, type MouseEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ExperienceCaseStudyCard } from "@/components/dashboard/ExperienceCaseStudyCard";
import { DashboardMobileFab } from "@/components/dashboard/DashboardMobileFab";
import { dispatchSagePrimaryActionDone } from "@/lib/sage-onboarding-primary";

interface ExperienceCaseStudy {
  case_id: string;
  service_class_id: string;
  service_class_name: string;
  case_name: string;
  case_summary: string | null;
  case_duration: string | null;
  display_year: number;
  case_highlights: string;
  case_study_url: string | null;
}

function DashboardPageContent() {
  const [isLoading, setIsLoading] = useState(true);
  const [experienceError, setExperienceError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [caseStudies, setCaseStudies] = useState<ExperienceCaseStudy[]>([]);
  const router = useRouter();
  const searchParams = useSearchParams();

  const timelineGroups = useMemo(() => {
    const grouped = new Map<number, ExperienceCaseStudy[]>();
    const unknownYear: ExperienceCaseStudy[] = [];

    for (const caseStudy of caseStudies) {
      if (typeof caseStudy.display_year === "number") {
        const current = grouped.get(caseStudy.display_year) || [];
        current.push(caseStudy);
        grouped.set(caseStudy.display_year, current);
      } else {
        unknownYear.push(caseStudy);
      }
    }

    const sortedYears = Array.from(grouped.keys()).sort((a, b) => b - a);
    return {
      byYear: sortedYears.map((year) => ({ year, caseStudies: grouped.get(year) || [] })),
      unknownYear,
    };
  }, [caseStudies]);

  const getErrorMessage = (errorCode: string): string => {
    const errorMessages: Record<string, string> = {
      linkedin_already_linked: "LinkedIn is already linked to another account",
      linkedin_no_email: "LinkedIn account does not have a verified email",
      auth_required: "Please sign in first to link your LinkedIn account",
      auth_failed: "Authentication failed. Please try again.",
      linkedin_auth_failed: "LinkedIn authentication failed. Please try again.",
    };
    return errorMessages[errorCode] || "An error occurred. Please try again.";
  };

  useEffect(() => {
    const enrichLogsParam = searchParams.get("enrichLogs");
    if (enrichLogsParam) {
      try {
        const base64 = enrichLogsParam.replace(/-/g, "+").replace(/_/g, "/");
        const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
        const logsJson = atob(padded);
        const logs = JSON.parse(logsJson);

        if (Array.isArray(logs) && logs.length > 0) {
          console.group("🔍 Profile Enrichment Logs");
          logs.forEach((log: { timestamp?: string; message?: string; level?: string; data?: unknown }) => {
            const logMessage = `[${log.timestamp}] ${log.message}`;
            if (log.level === "error") {
              console.error(logMessage, log.data);
            } else if (log.level === "warn") {
              console.warn(logMessage, log.data);
            } else {
              console.log(logMessage, log.data);
            }
          });
          console.groupEnd();
        }

        const newSearchParams = new URLSearchParams(searchParams.toString());
        newSearchParams.delete("enrichLogs");
        const newUrl = newSearchParams.toString()
          ? `${window.location.pathname}?${newSearchParams.toString()}`
          : window.location.pathname;
        router.replace(newUrl);
      } catch {
        const newSearchParams = new URLSearchParams(searchParams.toString());
        newSearchParams.delete("enrichLogs");
        const newUrl = newSearchParams.toString()
          ? `${window.location.pathname}?${newSearchParams.toString()}`
          : window.location.pathname;
        router.replace(newUrl);
      }
    }
  }, [searchParams, router]);

  useEffect(() => {
    const linked = searchParams.get("linked");
    const errorParam = searchParams.get("error");
    const errorDetails = searchParams.get("details");

    if (linked === "success") {
      setToast({ message: "LinkedIn account connected successfully!", type: "success" });
      router.replace("/dashboard", { scroll: false });
      setTimeout(() => setToast(null), 5000);
    } else if (errorParam) {
      const errorMessage = errorDetails
        ? decodeURIComponent(errorDetails)
        : getErrorMessage(errorParam);
      setToast({ message: errorMessage, type: "error" });
      router.replace("/dashboard", { scroll: false });
      setTimeout(() => setToast(null), 5000);
    }
  }, [searchParams, router]);

  const onAddExperiencePrimaryClick = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    dispatchSagePrimaryActionDone("experience_dashboard.experience.create_cta", {
      onUnconsumed: () => router.push("/dashboard/experience/new"),
    });
  };

  const loadExperienceCaseStudies = useCallback(async () => {
    try {
      const caseStudiesRes = await fetch("/api/experience/case-studies");
      const caseStudiesPayload = await caseStudiesRes.json();

      if (!caseStudiesRes.ok) {
        throw new Error(caseStudiesPayload.error || "Failed to load case studies");
      }

      setCaseStudies(caseStudiesPayload.caseStudies || []);
    } catch (loadError) {
      const message =
        loadError instanceof Error ? loadError.message : "Failed to load experience timeline";
      setExperienceError(message);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      setExperienceError(null);
      try {
        await loadExperienceCaseStudies();
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadExperienceCaseStudies]);

  const timelineBody = isLoading ? (
    <div className="flex min-h-[400px] items-center justify-center">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading experience timeline...</p>
    </div>
  ) : (
    <div
      id="experience-dashboard-root"
      className="relative min-w-0 flex-1 space-y-6 scroll-mt-4"
    >
        <div className="relative z-0 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-black dark:text-zinc-50">Experience Canvas</h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Timeline view of reusable case studies, grouped by start year.
            </p>
          </div>
        </div>

        {experienceError && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-300">
            {experienceError}
          </div>
        )}

        {timelineGroups.byYear.length === 0 && timelineGroups.unknownYear.length === 0 ? (
          <div
            id="experience-created-highlight"
            className="flex min-h-[360px] scroll-mt-4 items-center justify-center rounded-lg border border-dashed border-orange-200 bg-orange-50/40 p-8 text-center dark:border-zinc-700 dark:bg-zinc-900/90"
          >
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              No experiences yet. Use Add New Experiences to start your timeline.
            </p>
          </div>
        ) : (
          <div id="experience-created-highlight" className="scroll-mt-4 space-y-10">
            {timelineGroups.byYear.map(({ year, caseStudies: yearCaseStudies }) => (
              <section key={year} className="grid grid-cols-[88px_1fr] gap-4">
                <div className="pt-1 text-sm font-semibold text-zinc-500 dark:text-zinc-400">{year}</div>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {yearCaseStudies.map((caseStudy) => (
                    <ExperienceCaseStudyCard key={caseStudy.case_id} study={caseStudy} />
                  ))}
                </div>
              </section>
            ))}

            {timelineGroups.unknownYear.length > 0 && (
              <section className="grid grid-cols-[88px_1fr] gap-4">
                <div className="pt-1 text-sm font-semibold text-zinc-500 dark:text-zinc-400">Unknown</div>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {timelineGroups.unknownYear.map((caseStudy) => (
                    <ExperienceCaseStudyCard key={caseStudy.case_id} study={caseStudy} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
    </div>
  );

  return (
    <div className="relative min-h-[70vh] space-y-6 pb-24">
      {timelineBody}

      <div className="pointer-events-none fixed bottom-8 left-1/2 z-40 hidden -translate-x-1/2 lg:block">
        <Link
          href="/dashboard/experience/new"
          onClick={onAddExperiencePrimaryClick}
          className="sage-highlight-exp-create pointer-events-auto inline-block rounded-full bg-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
        >
          Add New Experiences
        </Link>
      </div>

      <DashboardMobileFab
        href="/dashboard/experience/new"
        ariaLabel="Add new experience"
        linkClassName="sage-highlight-exp-create"
        linkOnNavigateClick={onAddExperiencePrimaryClick}
      />

      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 rounded-lg px-6 py-4 shadow-lg transition-all ${
            toast.type === "success" ? "bg-green-500 text-white" : "bg-red-500 text-white"
          }`}
          role="alert"
        >
          <div className="flex items-center gap-2">
            <span>{toast.message}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="ml-2 text-white transition-colors hover:text-gray-200"
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


export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading experience timeline...</p>
        </div>
      }
    >
      <DashboardPageContent />
    </Suspense>
  );
}
