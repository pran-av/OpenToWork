"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
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
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log("[CampaignFlow] Starting anonymous auth initialization...");
        
        // Check existing session
        const { data: { session: existingSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("[CampaignFlow] Error getting session:", sessionError);
        }
        
        if (existingSession) {
          console.log("[CampaignFlow] Existing session found:", {
            user_id: existingSession.user?.id,
            email: existingSession.user?.email,
            is_anonymous: existingSession.user?.is_anonymous,
            access_token: existingSession.access_token ? "present" : "missing",
            expires_at: existingSession.expires_at,
          });
          
          // Decode JWT to check is_anonymous claim
          try {
            const jwtPayload = JSON.parse(atob(existingSession.access_token.split('.')[1]));
            console.log("[CampaignFlow] JWT payload:", {
              sub: jwtPayload.sub,
              email: jwtPayload.email,
              is_anonymous: jwtPayload.is_anonymous,
              role: jwtPayload.role,
              exp: jwtPayload.exp,
            });
          } catch (jwtError) {
            console.error("[CampaignFlow] Error decoding JWT:", jwtError);
          }
          
          setIsClient(true);
          return;
        }
        
        console.log("[CampaignFlow] No existing session, signing in anonymously...");
        
        // Sign in anonymously
        const { data: signInData, error: signInError } = await supabase.auth.signInAnonymously();
        
        if (signInError) {
          console.error("[CampaignFlow] Error signing in anonymously:", {
            message: signInError.message,
            status: signInError.status,
            name: signInError.name,
            fullError: signInError,
          });
          setIsClient(true); // Still render the page even if auth fails
          return;
        }
        
        if (signInData?.session) {
          console.log("[CampaignFlow] Anonymous sign-in successful:", {
            user_id: signInData.session.user?.id,
            email: signInData.session.user?.email,
            is_anonymous: signInData.session.user?.is_anonymous,
            access_token: signInData.session.access_token ? "present" : "missing",
            expires_at: signInData.session.expires_at,
          });
          
          // Decode JWT to verify is_anonymous claim
          try {
            const jwtPayload = JSON.parse(atob(signInData.session.access_token.split('.')[1]));
            console.log("[CampaignFlow] JWT payload after anonymous sign-in:", {
              sub: jwtPayload.sub,
              email: jwtPayload.email,
              is_anonymous: jwtPayload.is_anonymous,
              role: jwtPayload.role,
              exp: jwtPayload.exp,
            });
            
            if (jwtPayload.is_anonymous !== true) {
              console.warn("[CampaignFlow] WARNING: is_anonymous claim is not true in JWT!");
            }
          } catch (jwtError) {
            console.error("[CampaignFlow] Error decoding JWT after sign-in:", jwtError);
          }
        } else {
          console.warn("[CampaignFlow] Sign-in returned no session data");
        }
        
        setIsClient(true);
      } catch (error) {
        console.error("[CampaignFlow] Unexpected error during auth initialization:", error);
        setIsClient(true); // Still render the page even if auth fails
      }
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

