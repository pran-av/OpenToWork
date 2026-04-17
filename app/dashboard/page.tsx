"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ExperienceCaseStudyCard } from "@/components/dashboard/ExperienceCaseStudyCard";

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

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [caseStudies, setCaseStudies] = useState<ExperienceCaseStudy[]>([]);

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

  const loadExperienceData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const caseStudiesRes = await fetch("/api/experience/case-studies");
      const caseStudiesPayload = await caseStudiesRes.json();

      if (!caseStudiesRes.ok) {
        throw new Error(caseStudiesPayload.error || "Failed to load case studies");
      }

      setCaseStudies(caseStudiesPayload.caseStudies || []);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Failed to load experience timeline";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadExperienceData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading experience timeline...</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-[70vh] space-y-6 pb-24">
      <div>
        <h2 className="text-2xl font-semibold text-black dark:text-zinc-50">Experience Canvas</h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Timeline view of reusable case studies, grouped by start year.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-300">
          {error}
        </div>
      )}

      {timelineGroups.byYear.length === 0 && timelineGroups.unknownYear.length === 0 ? (
        <div className="flex min-h-[360px] items-center justify-center rounded-lg border border-dashed border-orange-200 bg-orange-50/40 p-8 text-center dark:border-zinc-700 dark:bg-zinc-900/90">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            No experiences yet. Use Add New Experiences to start your timeline.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
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

      <div className="pointer-events-none fixed bottom-8 left-1/2 z-40 -translate-x-1/2">
        <Link
          href="/dashboard/experience/new"
          className="pointer-events-auto inline-block rounded-full bg-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
        >
          Add New Experiences
        </Link>
      </div>
    </div>
  );
}
