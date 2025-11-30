"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ClientSummaryPage from "@/components/campaign/ClientSummaryPage";
import RelevantWorkPage from "@/components/campaign/RelevantWorkPage";
import CallToActionPage from "@/components/campaign/CallToActionPage";
import ProgressBar from "@/components/campaign/ProgressBar";
import NavigationButtons from "@/components/campaign/NavigationButtons";
import { useCampaignFlow } from "@/hooks/useCampaignFlow";

type FlowStage = "summary" | "relevant-work" | "cta";

export default function CampaignPage() {
  const params = useParams();
  const campaignId = params.id as string;
  
  const { stage, selectedService, setStage, setSelectedService } = useCampaignFlow(campaignId);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
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
            onConnect={() => handleNext("cta")}
          />
        );
      case "cta":
        return <CallToActionPage />;
      default:
        return <ClientSummaryPage onServiceSelect={(serviceId) => {
          setSelectedService(serviceId);
          handleNext("relevant-work");
        }} />;
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-4 py-6 md:px-8">
        {/* Progress Bar */}
        <ProgressBar currentStage={stage} />

        {/* Navigation Buttons */}
        <NavigationButtons
          stage={stage}
          onPrevious={handlePrevious}
          onClose={handleClose}
        />

        {/* Page Content */}
        <div className="mt-8">{renderPage()}</div>
      </div>
    </div>
  );
}

