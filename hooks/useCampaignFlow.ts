"use client";

import { useState, useEffect } from "react";

type FlowStage = "summary" | "relevant-work" | "cta";

export function useCampaignFlow(campaignId: string) {
  const storageKey = `campaign_flow_${campaignId}`;

  const [stage, setStageState] = useState<FlowStage>("summary");
  const [selectedService, setSelectedServiceState] = useState<string | null>(null);

  // Load from session storage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) {
        try {
          const data = JSON.parse(saved);
          if (data.stage) setStageState(data.stage);
          if (data.selectedService) setSelectedServiceState(data.selectedService);
        } catch (e) {
          console.error("Failed to parse session storage:", e);
        }
      }
    }
  }, [storageKey]);

  // Save to session storage whenever state changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(
        storageKey,
        JSON.stringify({
          stage,
          selectedService,
        })
      );
    }
  }, [stage, selectedService, storageKey]);

  const setStage = (newStage: FlowStage) => {
    setStageState(newStage);
  };

  const setSelectedService = (serviceId: string) => {
    setSelectedServiceState(serviceId);
  };

  const resetFlow = () => {
    setStageState("summary");
    setSelectedServiceState(null);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(storageKey);
    }
  };

  return {
    stage,
    selectedService,
    setStage,
    setSelectedService,
    resetFlow,
  };
}

