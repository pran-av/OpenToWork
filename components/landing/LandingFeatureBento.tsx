import type { ReactNode } from "react";
import { landingTheme } from "./landing-tokens";

/** Same title scale + weight across all #features rows. */
const FEATURE_TITLE =
  "font-poppins font-semibold text-2xl sm:text-3xl md:text-4xl leading-tight";

/** Same body scale + weight across all #features rows. */
const FEATURE_DESC = "font-inter mt-3 text-base font-normal leading-relaxed sm:text-lg";

/** Copy left, visual right on lg+; row height follows content; no clipping. */
const FEATURE_SPLIT =
  "grid min-w-0 w-full grid-cols-1 gap-8 lg:grid-cols-2 lg:items-start lg:gap-10 xl:gap-12";

const FEATURE_COPY_COL =
  "flex min-w-0 max-w-full flex-col justify-start break-words lg:max-w-[min(100%,34rem)] xl:max-w-[min(100%,36rem)] lg:pr-4 xl:pr-6";

/** Wraps visuals: centered in the column, full width of section, max width so UI does not spill on ultra-wide. */
function FeatureVisualFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex w-full min-w-0 max-w-full flex-col items-center max-lg:mt-8">
      <div className="w-full min-w-0 max-w-full flex justify-center px-0 sm:px-1">
        <div className="w-full min-w-0 max-w-xl sm:max-w-2xl lg:max-w-[min(100%,36rem)] xl:max-w-[min(100%,40rem)]">
          {children}
        </div>
      </div>
    </div>
  );
}

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
      <div className="grid w-full grid-cols-1 gap-4 md:gap-6">
        {/* Document — large white card */}
        <div
          className="flex w-full min-w-0 flex-col rounded-2xl border p-6 shadow-lg md:p-8"
          style={{
            backgroundColor: "#FFFFFF",
            borderColor: "#E8E4DC",
            boxShadow: "0 18px 40px -24px rgba(45, 36, 25, 0.25)",
          }}
        >
          <div className={FEATURE_SPLIT}>
            <div className={FEATURE_COPY_COL}>
              <h2 className={FEATURE_TITLE} style={{ color: landingTheme.ink }}>
                Turn your past work into proof that gets you shortlisted.
              </h2>
              <p className={FEATURE_DESC} style={{ color: landingTheme.muted }}>
                Show your impact with clear, structured case studies — so hiring managers quickly see what you’ve done and why it matters.
              </p>
            </div>
            <FeatureVisualFrame>{documentStories}</FeatureVisualFrame>
          </div>
        </div>

        {/* Campaigns — mustard */}
        <div
          className="flex w-full min-w-0 flex-col rounded-2xl border border-black/5 p-6 shadow-lg md:p-8"
          style={{
            backgroundColor: landingTheme.mustard,
            boxShadow: "0 18px 40px -24px rgba(45, 36, 25, 0.2)",
          }}
        >
          <div className={FEATURE_SPLIT}>
            <div className={FEATURE_COPY_COL}>
              <h2 className={FEATURE_TITLE} style={{ color: landingTheme.ink }}>
                Send tailored pitches instead of generic applications
              </h2>
              <p className={FEATURE_DESC} style={{ color: landingTheme.ink, opacity: 0.85 }}>
                Create personalized pitch pages for each role or client and share them with a single link..
              </p>
            </div>
            <FeatureVisualFrame>{campaigns}</FeatureVisualFrame>
          </div>
        </div>

        {/* Track — brown card */}
        <div
          className="flex w-full min-w-0 flex-col rounded-2xl p-6 text-white shadow-lg md:p-8"
          style={{
            backgroundColor: landingTheme.brown,
            boxShadow: "0 18px 40px -24px rgba(45, 36, 25, 0.35)",
          }}
        >
          <div className={FEATURE_SPLIT}>
            <div className={FEATURE_COPY_COL}>
              <h2 className={`${FEATURE_TITLE} text-white`}>
                Know which companies are actually interested in you
              </h2>
              <p className={`${FEATURE_DESC} text-white/90`}>
                See who viewed your pitch, what they looked at, and where they dropped off — so you can improve what works.
              </p>
            </div>
            <FeatureVisualFrame>{trackImpact}</FeatureVisualFrame>
          </div>
        </div>

        {/* Leads — cool grey */}
        <div
          className="flex w-full min-w-0 flex-col rounded-2xl border p-6 shadow-lg md:p-8"
          style={{
            backgroundColor: landingTheme.greyCard,
            borderColor: landingTheme.greyBorder,
            boxShadow: "0 18px 40px -24px rgba(45, 36, 25, 0.15)",
          }}
        >
          <div className={FEATURE_SPLIT}>
            <div className={FEATURE_COPY_COL}>
              <h2 className={FEATURE_TITLE} style={{ color: landingTheme.ink }}>
                Turn interest into real opportunities
              </h2>
              <p className={FEATURE_DESC} style={{ color: landingTheme.muted }}>
                Let interested recruiters or decision makers reach out directly — so you can follow up and close faster.
              </p>
            </div>
            <FeatureVisualFrame>{collectLeads}</FeatureVisualFrame>
          </div>
        </div>

        {/* Organise */}
        <div
          className="flex w-full min-w-0 flex-col rounded-2xl border border-[#E8E4DC] bg-white p-6 shadow-lg md:p-8"
          style={{
            boxShadow: "0 18px 40px -24px rgba(45, 36, 25, 0.2)",
          }}
        >
          <div className={FEATURE_SPLIT}>
            <div className={FEATURE_COPY_COL}>
              <h2 className={FEATURE_TITLE} style={{ color: landingTheme.ink }}>
                Update your pitch anytime without sending new links
              </h2>
              <p className={FEATURE_DESC} style={{ color: landingTheme.muted }}>
                Make changes once and keep every shared pitch up to date — no resending, no confusion.
              </p>
            </div>
            <FeatureVisualFrame>{organise}</FeatureVisualFrame>
          </div>
        </div>
      </div>
    </section>
  );
}
