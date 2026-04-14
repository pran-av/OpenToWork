"use client";

import { Check } from "lucide-react";

export type ExperienceCaseStudyCardModel = {
  case_id: string;
  service_class_name: string;
  case_name: string;
  case_summary: string | null;
  case_duration: string | null;
  case_highlights: string;
  case_study_url: string | null;
};

function parseHighlights(highlightsString: string): string[] {
  return highlightsString.split(";").filter((h) => h.trim().length > 0);
}

export function ExperienceCaseStudyCard({ study }: { study: ExperienceCaseStudyCardModel }) {
  const highlights = parseHighlights(study.case_highlights || "");
  const hasUrl = Boolean(study.case_study_url?.trim());

  const handleCardClick = () => {
    const url = study.case_study_url?.trim();
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <article
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (!hasUrl) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleCardClick();
        }
      }}
      role={hasUrl ? "link" : undefined}
      tabIndex={hasUrl ? 0 : undefined}
      className={`rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all dark:border-zinc-700 dark:bg-zinc-950 ${
        hasUrl
          ? "cursor-pointer hover:border-blue-400 hover:shadow-md dark:hover:border-blue-500"
          : "cursor-default"
      }`}
    >
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-orange-600 dark:text-orange-400">
        {study.service_class_name.toUpperCase()}
      </p>
      <h3 className="mb-2 text-xl font-bold text-gray-900 dark:text-zinc-50">{study.case_name}</h3>
      {study.case_duration?.trim() ? (
        <p className="mb-3 text-sm text-gray-500 dark:text-zinc-400">{study.case_duration}</p>
      ) : null}
      {study.case_summary?.trim() ? (
        <p className="mb-4 text-base leading-relaxed text-gray-700 dark:text-zinc-300">{study.case_summary}</p>
      ) : null}
      {highlights.length > 0 ? (
        <div className="mt-6 space-y-4">
          {highlights.map((highlight, idx) => (
            <div key={idx} className="flex items-start gap-3">
              <Check className="mt-0.5 h-5 w-5 shrink-0 text-green-500" strokeWidth={2} aria-hidden />
              <span className="text-sm leading-relaxed text-gray-700 dark:text-zinc-300">{highlight.trim()}</span>
            </div>
          ))}
        </div>
      ) : null}
    </article>
  );
}
