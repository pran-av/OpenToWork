import dynamic from "next/dynamic";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { HeroSection } from "@/components/landing/HeroSection";
import { LandingFeatureSection } from "@/components/landing/LandingFeatureSection";
import { IsThisForMeSection } from "@/components/landing/IsThisForMeSection";
import { WhySignUpSection } from "@/components/landing/WhySignUpSection";
import { FinalSignupCta } from "@/components/landing/FinalSignupCta";

const pulse = (
  <div className="min-h-[240px] rounded-2xl bg-orange-50/60 border border-orange-100 animate-pulse" />
);

const CaseStudyCardStack = dynamic(
  () =>
    import("@/components/landing/CaseStudyCardStack").then((m) => ({
      default: m.CaseStudyCardStack,
    })),
  { loading: () => pulse }
);

const CampaignsShareVisual = dynamic(
  () =>
    import("@/components/landing/CampaignsShareVisual").then((m) => ({
      default: m.CampaignsShareVisual,
    })),
  { loading: () => pulse }
);

const TrackImpactVisual = dynamic(
  () =>
    import("@/components/landing/TrackImpactVisual").then((m) => ({
      default: m.TrackImpactVisual,
    })),
  { loading: () => pulse }
);

const CollectLeadsVisual = dynamic(
  () =>
    import("@/components/landing/CollectLeadsVisual").then((m) => ({
      default: m.CollectLeadsVisual,
    })),
  { loading: () => pulse }
);

const OrganiseCampaignsVisual = dynamic(
  () =>
    import("@/components/landing/OrganiseCampaignsVisual").then((m) => ({
      default: m.OrganiseCampaignsVisual,
    })),
  { loading: () => pulse }
);

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="fixed inset-0 z-0 bg-orange-50">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `repeating-linear-gradient(
              45deg,
              transparent,
              transparent 10px,
              rgba(255, 184, 0, 0.12) 10px,
              rgba(255, 184, 0, 0.12) 20px
            )`,
          }}
        />
      </div>

      <LandingHeader />

      <main className="flex-1 relative z-10 flex flex-col">
        <HeroSection />

        <LandingFeatureSection
          title="Document Stories from your Career"
          description="Document your experiences as case studies, quantify your impacts, and link them to live prototypes, designs, or repositories"
          visual={<CaseStudyCardStack />}
        />

        <LandingFeatureSection
          title="Create Campaigns and Share them as Pitches"
          description="Create campaigns from your Stories and Pitch those campaigns to hiring managers, founders, or decision makers with a one-time shareable link."
          visual={<CampaignsShareVisual />}
          visualFirst
        />

        <LandingFeatureSection
          title="Track the Impact of your Campaigns"
          description="Keep track of visitors on your campaigns, their actions, and time spent. Use this insight to create campaigns that convert."
          visual={<TrackImpactVisual />}
        />

        <LandingFeatureSection
          title="Collect Leads and Reach Out to them later"
          description="Hiring managers or decision makers impressed by your campaigns can share their contact details. Filter reach out and close the opportunities."
          visual={<CollectLeadsVisual />}
          visualFirst
        />

        <LandingFeatureSection
          title="Update Shared Pitches without resharing links"
          description="Switch campaigns that you want to be Active and available on your shared pitch links. Each project can have one active and many inactive campaigns. Shared links auto update your active campaign."
          visual={<OrganiseCampaignsVisual />}
        />

        <IsThisForMeSection />
        <WhySignUpSection />
        <FinalSignupCta />
      </main>

      <LandingFooter />
    </div>
  );
}
