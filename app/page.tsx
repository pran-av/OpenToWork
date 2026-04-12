import dynamic from "next/dynamic";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { HeroSection } from "@/components/landing/HeroSection";
import { ProductDemoVideoSection } from "@/components/landing/ProductDemoVideoSection";
import { HeroSkillMarqueeSection } from "@/components/landing/HeroSkillMarqueeSection";
import { LandingFeatureBento } from "@/components/landing/LandingFeatureBento";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { FinalSignupCta } from "@/components/landing/FinalSignupCta";
import { landingTheme } from "@/components/landing/landing-tokens";

const pulse = (
  <div
    className="min-h-[240px] rounded-2xl animate-pulse border"
    style={{ backgroundColor: "rgba(255,255,255,0.35)", borderColor: "#E8E4DC" }}
  />
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
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: landingTheme.cream }}>
      <div className="fixed inset-0 z-0 pointer-events-none" style={{ backgroundColor: landingTheme.cream }}>
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage: `repeating-linear-gradient(
              45deg,
              transparent,
              transparent 12px,
              rgba(93, 74, 58, 0.04) 12px,
              rgba(93, 74, 58, 0.04) 24px
            )`,
          }}
        />
      </div>

      <LandingHeader />

      <main className="flex-1 relative z-10 flex flex-col">
        <HeroSection />

        <ProductDemoVideoSection />

        <HeroSkillMarqueeSection />

        <LandingFeatureBento
          documentStories={<CaseStudyCardStack />}
          trackImpact={<TrackImpactVisual />}
          campaigns={<CampaignsShareVisual />}
          collectLeads={<CollectLeadsVisual />}
          organise={<OrganiseCampaignsVisual />}
        />

        <HowItWorksSection />
        <FinalSignupCta />
      </main>

      <LandingFooter />
    </div>
  );
}
