import type { CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";
import { FilePenLine, LineChart, Share2, Target, UserPlus } from "lucide-react";
import { landingColors, landingTheme } from "./landing-tokens";

type Step = {
  n: number;
  title: string;
  description: string;
  Icon: LucideIcon;
  variant: "cream" | "mustard" | "salmon" | "accent" | "deep";
};

const STEPS: Step[] = [
  {
    n: 1,
    title: "Create your profile in minutes",
    description: "Get everything ready in one place so you can start pitching quickly",
    Icon: UserPlus,
    variant: "cream",
  },
  {
    n: 2,
    title: "Tailor your pitch for each opportunity",
    description: "Show why you’re the right fit instead of sending the same application everywhere",
    Icon: Target,
    variant: "mustard",
  },
  {
    n: 3,
    title: "Show proof of what you’ve done",
    description: "Add real work, results, and outcomes that hiring managers care about",
    Icon: FilePenLine,
    variant: "salmon",
  },
  {
    n: 4,
    title: "Share one link that tells your story",
    description: "Send a clean, focused pitch instead of attachments and long emails",
    Icon: Share2,
    variant: "accent",
  },
  {
    n: 5,
    title: "See what’s working and improve fast",
    description: "Track interest, learn what gets attention, and refine your pitch",
    Icon: LineChart,
    variant: "deep",
  },
];

function nodeStyle(variant: Step["variant"]): CSSProperties {
  switch (variant) {
    case "cream":
      return {
        backgroundColor: "rgba(255, 140, 0, 0.12)",
        color: landingTheme.brown,
        border: "1px solid rgba(224, 123, 57, 0.28)",
      };
    case "mustard":
      return {
        backgroundColor: "rgba(240, 193, 75, 0.5)",
        color: landingTheme.brown,
        border: "1px solid rgba(93, 74, 58, 0.12)",
      };
    case "salmon":
      return {
        backgroundColor: "rgba(255, 184, 0, 0.22)",
        color: landingTheme.brown,
        border: "1px solid rgba(224, 123, 57, 0.22)",
      };
    case "accent":
      return {
        backgroundColor: landingColors.primary,
        color: "#FFFFFF",
        border: "1px solid rgba(0,0,0,0.06)",
      };
    case "deep":
    default:
      return {
        backgroundColor: landingTheme.brown,
        color: "#FFFFFF",
        border: "1px solid rgba(0,0,0,0.08)",
      };
  }
}

export function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="relative z-10 border-t border-[#E8E4DC]/80 py-12 md:py-14 px-4 sm:px-6 lg:px-8"
      style={{ backgroundColor: landingTheme.creamDark }}
    >
      <div className="mx-auto w-full max-w-3xl lg:max-w-4xl">
        <h2 className="text-center font-poppins text-2xl font-semibold sm:text-3xl md:text-4xl" style={{ color: landingTheme.ink }}>
          How you turn your experience into interviews
        </h2>
        <p
          className="mx-auto mt-2 max-w-2xl text-center font-inter text-sm sm:text-base"
          style={{ color: landingTheme.muted }}
        >
          A simple way to stand out without sending generic resumes
        </p>

        <ol className="relative mx-auto mt-9 max-w-2xl list-none space-y-6 md:mt-10 md:max-w-none md:space-y-5">
          <span
            className="pointer-events-none absolute bottom-4 left-[1.25rem] top-4 w-0 border-l-2 border-dashed sm:left-[1.35rem] md:left-1/2 md:top-6 md:-translate-x-1/2"
            style={{ borderColor: "#E8E4DC" }}
            aria-hidden
          />

          {STEPS.map((step, i) => {
            const flip = i % 2 === 1;
            return (
              <li
                key={step.n}
                className={[
                  "relative z-[1] flex flex-col gap-2.5 pl-6 sm:gap-3 sm:pl-7",
                  "md:flex-row md:items-center md:justify-center md:gap-6 md:pl-0",
                  flip ? "md:flex-row-reverse" : "",
                ].join(" ")}
              >
                <div className="flex flex-row items-start gap-3 md:w-[7.5rem] md:shrink-0 md:flex-col md:items-center md:gap-1.5">
                  <span
                    className="mt-0.5 inline-flex rounded-full px-2 py-0.5 font-inter text-[10px] font-semibold uppercase tracking-wide md:mt-0 md:text-[11px]"
                    style={{
                      backgroundColor: "rgba(255, 140, 0, 0.14)",
                      color: landingTheme.brown,
                    }}
                  >
                    Step {step.n}
                  </span>
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full shadow-md sm:h-11 sm:w-11"
                    style={nodeStyle(step.variant)}
                  >
                    <step.Icon className="h-[1.15rem] w-[1.15rem] sm:h-5 sm:w-5" strokeWidth={2} aria-hidden />
                  </div>
                </div>

                <article
                  className="min-w-0 flex-1 rounded-xl border bg-white/95 p-3.5 shadow-sm sm:p-4 md:max-w-[20rem] lg:max-w-[22rem]"
                  style={{ borderColor: "#E8E4DC" }}
                >
                  <h3 className="font-poppins text-sm font-semibold leading-snug sm:text-base" style={{ color: landingTheme.brown }}>
                    {step.title}
                  </h3>
                  <p className="mt-1.5 font-inter text-xs leading-relaxed sm:text-sm" style={{ color: landingTheme.muted }}>
                    {step.description}
                  </p>
                </article>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
