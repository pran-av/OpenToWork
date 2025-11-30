"use client";

import type { CampaignData, ClientService } from "@/lib/db/campaigns";

interface ClientSummaryPageProps {
  campaign: CampaignData;
  services: ClientService[];
  onServiceSelect: (serviceId: string) => void;
}

export default function ClientSummaryPage({
  campaign,
  services,
  onServiceSelect,
}: ClientSummaryPageProps) {
  const clientName = campaign.campaign_structure.client_name;
  const clientSummary = campaign.campaign_structure.client_summary;

  // Split summary into paragraphs (assuming it's stored as a single string with line breaks or as paragraphs)
  const summaryParagraphs = clientSummary
    .split(/\n\n|\n/)
    .filter((p) => p.trim().length > 0);

  return (
    <div className="mx-auto max-w-2xl">
      {/* Greeting */}
      <p className="mb-2 text-sm text-gray-500">Hello! I am Nora - your guide to</p>

      {/* Main Title */}
      <h1 className="mb-6 text-4xl font-bold text-gray-900 md:text-5xl">
        Hire {clientName}!
      </h1>

      {/* Client Summary */}
      <div className="mb-8 space-y-4">
        {summaryParagraphs.length > 0 ? (
          summaryParagraphs.map((paragraph, index) => (
            <p key={index} className="text-base leading-relaxed text-gray-700">
              {paragraph}
            </p>
          ))
        ) : (
          <p className="text-base leading-relaxed text-gray-700">{clientSummary}</p>
        )}
      </div>

      {/* Service Selection Prompt */}
      <p className="mb-6 text-base text-gray-700">
        {clientName} offers following services, select as per your requirements, so I can guide you further
      </p>

      {/* Service Selection Buttons */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {services.map((service) => (
          <button
            key={service.client_service_id}
            onClick={() => onServiceSelect(service.client_service_id)}
            className="rounded-lg border border-gray-200 bg-gray-50 px-6 py-4 text-left transition-all hover:border-blue-400 hover:bg-blue-50 hover:shadow-sm"
          >
            <span className="text-base font-medium text-gray-900">
              {service.client_service_name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

