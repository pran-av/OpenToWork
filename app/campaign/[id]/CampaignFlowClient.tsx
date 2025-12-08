"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ensureAnonymousAuth } from "@/lib/utils/auth";
import ClientSummaryPage from "@/components/campaign/ClientSummaryPage";
import RelevantWorkPage from "@/components/campaign/RelevantWorkPage";
import CallToActionPage from "@/components/campaign/CallToActionPage";
import ProgressBar from "@/components/campaign/ProgressBar";
import NavigationButtons from "@/components/campaign/NavigationButtons";
import { useCampaignFlow } from "@/hooks/useCampaignFlow";
import type { CampaignData, ClientService, CaseStudy } from "@/lib/db/campaigns";
import type { WidgetData } from "@/lib/db/widgets";

type FlowStage = "summary" | "relevant-work" | "cta";

interface CampaignFlowClientProps {
  campaign: CampaignData;
  services: ClientService[];
  caseStudiesMap: Record<string, CaseStudy[]>;
  widget: WidgetData | null;
}

export default function CampaignFlowClient({
  campaign,
  services,
  caseStudiesMap,
  widget,
}: CampaignFlowClientProps) {
  const { stage, selectedService, setStage, setSelectedService } = useCampaignFlow(
    campaign.campaign_id
  );
  const [isClient, setIsClient] = useState(false);
  const supabase = createClient();

  // Initialize anonymous authentication on component mount
  // PRD Requirement: Check if permanent user exists first, then check for anonymous user, then sign in anonymously
  useEffect(() => {
    const initializeAuth = async () => {
      // Use shared utility function for auth initialization
      await ensureAnonymousAuth(supabase, "CampaignFlow");
      // Always render the page, even if auth fails (graceful degradation)
    setIsClient(true);
    };

    initializeAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isClient) {
    return null;
  }

  const handleNext = (nextStage: FlowStage) => {
    setStage(nextStage);
  };

  const handlePrevious = () => {
    if (stage === "relevant-work") {
      setStage("summary");
    } else if (stage === "cta") {
      setStage("relevant-work");
    }
  };

  const handleClose = () => {
    if (typeof window !== "undefined") {
      window.close();
    }
  };

  const renderPage = () => {
    switch (stage) {
      case "summary":
        return (
          <ClientSummaryPage
            campaign={campaign}
            services={services}
            onServiceSelect={(serviceId) => {
              setSelectedService(serviceId);
              handleNext("relevant-work");
            }}
          />
        );
      case "relevant-work":
        return (
          <RelevantWorkPage
            selectedServiceId={selectedService}
            services={services}
            caseStudiesMap={caseStudiesMap}
            onConnect={() => handleNext("cta")}
          />
        );
      case "cta":
        return <CallToActionPage campaign={campaign} />;
      default:
        return (
          <ClientSummaryPage
            campaign={campaign}
            services={services}
            onServiceSelect={(serviceId) => {
              setSelectedService(serviceId);
              handleNext("relevant-work");
            }}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-4 py-6 md:px-8">
        {/* Progress Bar */}
        <ProgressBar currentStage={stage} />

        {/* Navigation Buttons with Widget */}
        <NavigationButtons
          stage={stage}
          onPrevious={handlePrevious}
          onClose={handleClose}
          widgetId={widget?.widget_id || null}
        />

        {/* Page Content */}
        <div className="mt-8">{renderPage()}</div>
      </div>
    </div>
  );
}

