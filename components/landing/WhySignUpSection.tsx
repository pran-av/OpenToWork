import { landingColors, landingTheme } from "./landing-tokens";

type RoadmapStep = {
  phase: string;
  title: string;
  points: string[];
  emphasis?: "current";
};

/** Ordered as a journey: where you are → what’s next → what’s coming → launch */
const ROADMAP: RoadmapStep[] = [
  {
    phase: "Now",
    title: "Become a Believer",
    emphasis: "current",
    points: ["We are in Public Beta and Free to Use until we figure the Target Market"],
  },
  {
    phase: "Next",
    title: "Stay productive",
    points: ["Track and Store Resumes", "Compare Resume Fit to JD"],
  },
  {
    phase: "On the roadmap",
    title: "Pitch even better soon",
    points: [
      "Video Pitches",
      "Organise Case Studies in better ways",
      "Ways to get opportunities via Referrals",
      "AI Assistant to help you Plan your Campaigns",
      "Assistant to help you track your Career",
    ],
  },
  {
    phase: "At launch",
    title: "Launch perks",
    points: ["Discounted Offers for Believers when we Launch"],
  },
];

export function WhySignUpSection() {
  return (
    <section
      className="relative z-10 border-t border-[#E8E4DC]/80 py-14 md:py-20 px-4 sm:px-6 lg:px-8"
      style={{ backgroundColor: landingTheme.creamDark }}
    >
      <div className="w-full">
        <h2 className="text-center font-poppins text-2xl font-semibold sm:text-3xl md:text-4xl" style={{ color: landingTheme.ink }}>
          Why Should I Sign Up
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center font-inter text-sm sm:text-base" style={{ color: landingTheme.muted }}>
          Where we are today and what we’re building toward—no guesswork.
        </p>

        <div className="relative mt-12 w-full">
          {/* Vertical spine */}
          <div
            className="absolute left-[1.125rem] top-6 bottom-6 w-px sm:left-5 md:left-[1.375rem]"
            style={{ backgroundColor: "#E8E4DC" }}
            aria-hidden
          />

          <ol className="relative list-none space-y-0">
            {ROADMAP.map((step, i) => {
              const isLast = i === ROADMAP.length - 1;
              return (
                <li key={step.title} className={isLast ? "" : "pb-10 sm:pb-12"}>
                  <div className="flex gap-4 sm:gap-6">
                    {/* Step marker */}
                    <div className="relative z-[1] flex shrink-0 flex-col items-center">
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-full border-2 bg-white font-poppins text-sm font-bold shadow-sm sm:h-11 sm:w-11 sm:text-base"
                        style={{
                          borderColor: step.emphasis === "current" ? landingTheme.brown : "#E8E4DC",
                          color: step.emphasis === "current" ? landingTheme.brown : landingTheme.muted,
                          boxShadow:
                            step.emphasis === "current"
                              ? `0 0 0 4px rgba(93, 74, 58, 0.12)`
                              : undefined,
                        }}
                      >
                        {i + 1}
                      </div>
                    </div>

                    {/* Card */}
                    <div
                      className="min-w-0 flex-1 rounded-2xl border bg-white p-5 shadow-sm sm:p-6"
                      style={{ borderColor: "#E8E4DC" }}
                    >
                      <p
                        className="font-inter text-[11px] font-semibold uppercase tracking-[0.12em] sm:text-xs"
                        style={{ color: landingColors.tertiary }}
                      >
                        {step.phase}
                      </p>
                      <h3 className="mt-1 font-poppins text-lg font-semibold sm:text-xl" style={{ color: landingTheme.ink }}>
                        {step.title}
                      </h3>
                      <ul className="mt-4 space-y-2.5" role="list">
                        {step.points.map((p) => (
                          <li key={p} className="flex gap-2.5 font-inter text-sm sm:text-base" style={{ color: landingTheme.muted }}>
                            <span
                              className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full"
                              style={{ backgroundColor: landingTheme.mustardDeep }}
                              aria-hidden
                            />
                            <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
