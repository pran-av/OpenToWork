"use client";

import { Check } from "lucide-react";
import type { ClientService, CaseStudy } from "@/lib/db/campaigns";

interface RelevantWorkPageProps {
  selectedServiceId: string | null;
  services: ClientService[];
  caseStudiesMap: Record<string, CaseStudy[]>;
  onConnect: () => void;
}

export default function RelevantWorkPage({
  selectedServiceId,
  services,
  caseStudiesMap,
  onConnect,
}: RelevantWorkPageProps) {
  const selectedService = services.find(
    (s) => s.client_service_id === selectedServiceId
  );

  const caseStudies = selectedServiceId
    ? caseStudiesMap[selectedServiceId] || []
    : [];

  const handleCardClick = (url: string | null) => {
    if (url && url.trim()) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  // Parse highlights from semicolon-separated string
  const parseHighlights = (highlightsString: string): string[] => {
    return highlightsString.split(";").filter((h) => h.trim().length > 0);
  };

  if (!selectedService) {
    return (
      <div className="mx-auto max-w-4xl">
        <p className="text-gray-600">Please select a service first.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      {/* Selection Label */}
      <p className="mb-2 text-sm text-gray-500">You Selected</p>

      {/* Service Title */}
      <h1 className="mb-2 text-3xl font-bold text-gray-900 md:text-4xl">
        {selectedService.client_service_name}
      </h1>

      {/* Service Summary - Using a default message since we don't have service summary in DB */}
      <p className="mb-6 text-base text-gray-700">
        Explore relevant case studies from past work in this area.
      </p>

      {/* Suggestion Text */}
      <p className="mb-6 text-base text-gray-700">
        I suggest going through following case studies from past work
      </p>

      {/* Case Study Cards */}
      {caseStudies.length > 0 ? (
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          {caseStudies.map((study) => {
            const highlights = parseHighlights(study.case_highlights);
            const hasUrl = study.case_study_url && study.case_study_url.trim();
            return (
              <div
                key={study.case_id}
                onClick={() => handleCardClick(study.case_study_url)}
                className={`rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all ${
                  hasUrl
                    ? "cursor-pointer hover:border-blue-400 hover:shadow-md"
                    : "cursor-default"
                }`}
              >
                <h3 className="mb-2 text-xl font-bold text-gray-900">
                  {study.case_name}
                </h3>
                <p className="mb-3 text-sm text-gray-500">{study.case_duration}</p>
                <p className="mb-4 text-base leading-relaxed text-gray-700">
                  {study.case_summary}
                </p>
                {highlights.length > 0 && (
                  <div className="space-y-2">
                    {highlights.map((highlight, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
                        <span className="text-sm text-gray-700">{highlight.trim()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mb-8 rounded-lg border border-gray-200 bg-gray-50 p-6">
          <p className="text-gray-600">No case studies available for this service yet.</p>
        </div>
      )}

      {/* Connect CTA Button */}
      <div className="flex justify-end">
        <button
          onClick={onConnect}
          className="rounded-lg bg-gray-800 px-8 py-3 font-semibold text-white transition-colors hover:bg-gray-900"
        >
          CONNECT
        </button>
      </div>
    </div>
  );
}

