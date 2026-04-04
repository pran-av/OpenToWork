import type { ReactNode } from "react";
import { landingTheme } from "./landing-tokens";

type Props = {
  documentStories: ReactNode;
  trackImpact: ReactNode;
  campaigns: ReactNode;
  collectLeads: ReactNode;
  organise: ReactNode;
};

export function LandingFeatureBento({
  documentStories,
  trackImpact,
  campaigns,
  collectLeads,
  organise,
}: Props) {
  return (
    <section
      id="features"
      className="relative z-10 px-4 sm:px-6 lg:px-8 py-12 md:py-16 border-t border-[#E8E4DC]/80"
    >
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-6 gap-4 md:gap-6">
        {/* Document — large white card */}
        <div
          className="md:col-span-4 rounded-2xl p-6 md:p-8 shadow-lg border"
          style={{
            backgroundColor: "#FFFFFF",
            borderColor: "#E8E4DC",
            boxShadow: "0 18px 40px -24px rgba(45, 36, 25, 0.25)",
          }}
        >
          <h2 className="font-poppins font-semibold text-2xl sm:text-3xl md:text-4xl leading-tight" style={{ color: landingTheme.ink }}>
            Document Stories from your Career
          </h2>
          <p className="font-inter text-base sm:text-lg mt-4 leading-relaxed" style={{ color: landingTheme.muted }}>
            Document your experiences as case studies, quantify your impacts, and link them to live prototypes, designs,
            or repositories
          </p>
          <div className="mt-8 min-h-[200px]">{documentStories}</div>
        </div>

        {/* Track — brown card */}
        <div
          className="md:col-span-2 rounded-2xl p-6 md:p-8 shadow-lg text-white flex flex-col"
          style={{
            backgroundColor: landingTheme.brown,
            boxShadow: "0 18px 40px -24px rgba(45, 36, 25, 0.35)",
          }}
        >
          <h2 className="font-poppins font-semibold text-xl sm:text-2xl md:text-3xl leading-tight text-white">
            Track the Impact of your Campaigns
          </h2>
          <p className="font-inter text-sm sm:text-base mt-3 leading-relaxed text-white/90">
            Keep track of visitors on your campaigns, their actions, and time spent. Use this insight to create campaigns
            that convert.
          </p>
          <div className="mt-6 flex-1 flex items-center min-h-[200px]">{trackImpact}</div>
        </div>

        {/* Campaigns — mustard */}
        <div
          className="md:col-span-3 rounded-2xl p-6 md:p-8 shadow-lg border border-black/5"
          style={{
            backgroundColor: landingTheme.mustard,
            boxShadow: "0 18px 40px -24px rgba(45, 36, 25, 0.2)",
          }}
        >
          <h2 className="font-poppins font-semibold text-xl sm:text-2xl md:text-3xl leading-tight" style={{ color: landingTheme.ink }}>
            Create Campaigns and Share them as Pitches
          </h2>
          <p className="font-inter text-sm sm:text-base mt-3 leading-relaxed" style={{ color: landingTheme.ink, opacity: 0.85 }}>
            Create campaigns from your Stories and Pitch those campaigns to hiring managers, founders, or decision makers
            with a one-time shareable link.
          </p>
          <div className="mt-8 min-h-[200px]">{campaigns}</div>
        </div>

        {/* Leads — cool grey */}
        <div
          className="md:col-span-3 rounded-2xl p-6 md:p-8 shadow-lg border"
          style={{
            backgroundColor: landingTheme.greyCard,
            borderColor: landingTheme.greyBorder,
            boxShadow: "0 18px 40px -24px rgba(45, 36, 25, 0.15)",
          }}
        >
          <h2 className="font-poppins font-semibold text-xl sm:text-2xl md:text-3xl leading-tight" style={{ color: landingTheme.ink }}>
            Collect Leads and Reach Out to them later
          </h2>
          <p className="font-inter text-sm sm:text-base mt-3 leading-relaxed" style={{ color: landingTheme.muted }}>
            Hiring managers or decision makers impressed by your campaigns can share their contact details. Filter reach
            out and close the opportunities.
          </p>
          <div className="mt-8 min-h-[200px]">{collectLeads}</div>
        </div>

        {/* Organise — full width */}
        <div
          className="md:col-span-6 rounded-2xl p-6 md:p-8 shadow-lg border bg-white"
          style={{
            borderColor: "#E8E4DC",
            boxShadow: "0 18px 40px -24px rgba(45, 36, 25, 0.2)",
          }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            <div>
              <h2 className="font-poppins font-semibold text-2xl sm:text-3xl md:text-4xl leading-tight" style={{ color: landingTheme.ink }}>
                Update Shared Pitches without resharing links
              </h2>
              <p className="font-inter text-base sm:text-lg mt-4 leading-relaxed" style={{ color: landingTheme.muted }}>
                Switch campaigns that you want to be Active and available on your shared pitch links. Each project can
                have one active and many inactive campaigns. Shared links auto update your active campaign.
              </p>
            </div>
            <div className="min-h-[200px]">{organise}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
