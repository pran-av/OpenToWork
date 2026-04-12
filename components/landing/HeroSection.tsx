"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { SAMPLE_PITCH_URL, landingTheme } from "./landing-tokens";
import { HeroSkillCollage } from "./HeroSkillCollage";
import { HeroSkillMarqueeHorizontal } from "./HeroSkillMarqueeHorizontal";

const SKILL_CARDS_LEFT = [
  { src: "/landing/root_cause_analysis.png", alt: "Root cause analysis" },
  { src: "/landing/product_strategy.png", alt: "Product strategy" },
  { src: "/landing/databases.png", alt: "Databases" },
];

const SKILL_CARDS_RIGHT = [
  { src: "/landing/go_to_market.png", alt: "Go to market" },
  { src: "/landing/user_research.png", alt: "User research" },
  { src: "/landing/prototyping.png", alt: "Prototyping" },
];

const AUDIENCE_LABELS = ["For Engineers", "For Designers", "For Product Managers"] as const;

const AUDIENCE_LABEL_INTERVAL_MS = 2800;

export function HeroSection() {
  const [authUrl, setAuthUrl] = useState("/auth");
  const [audienceLabelIndex, setAudienceLabelIndex] = useState(0);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setAuthUrl(`${window.location.origin}/auth`);
    }
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setAudienceLabelIndex((i) => (i + 1) % AUDIENCE_LABELS.length);
    }, AUDIENCE_LABEL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  return (
    <section className="relative z-10 pt-24 md:pt-28 pb-16 md:pb-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Mobile / tablet: column, ~60% copy / ~40% marquee; lg+: grid unchanged */}
        <div className="flex min-h-[calc(100svh-5.5rem)] flex-col items-stretch lg:min-h-0 lg:grid lg:grid-cols-12 lg:gap-8 xl:gap-12 lg:items-center">
          {/* Copy + CTAs — flex-[3] ≈ 60% of hero column on small screens */}
          <div className="flex min-h-0 flex-[3] flex-col justify-center space-y-6 text-center md:space-y-8 lg:col-span-6 lg:flex-none lg:text-left">
            <div className="space-y-4 md:space-y-5">
              <p
                className="font-inter text-sm sm:text-base font-medium flex justify-center lg:justify-start"
                aria-live="polite"
              >
                <span
                  className="inline-flex items-center rounded-full border px-3 py-1 shadow-sm overflow-hidden"
                  style={{
                    borderColor: landingTheme.greyBorder,
                    backgroundColor: landingTheme.greyCard,
                    color: landingTheme.brown,
                  }}
                >
                  <span key={AUDIENCE_LABELS[audienceLabelIndex]} className="hero-audience-label-text">
                    {AUDIENCE_LABELS[audienceLabelIndex]}
                  </span>
                </span>
              </p>
              <h1
                className="font-poppins font-semibold text-3xl sm:text-4xl md:text-5xl leading-tight"
                style={{ color: landingTheme.ink }}
              >
                Get more interviews without relying on resumes or cold emails
              </h1>
              <p
                className="font-inter text-base sm:text-lg md:text-xl leading-relaxed max-w-xl mx-auto lg:mx-0"
                style={{ color: landingTheme.muted }}
              >
                Create personalized pitch pages that show your work and get recruiters to respond
              </p>
            </div>

            <div className="flex flex-col sm:flex-row lg:justify-start items-stretch sm:items-center justify-center gap-3 sm:gap-4 pt-2">
              <Link
                href={authUrl}
                onClick={() => {
                  if (typeof window !== "undefined" && (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag) {
                    (window as unknown as { gtag: (...a: unknown[]) => void }).gtag("event", "click", {
                      event_category: "CTA",
                      event_label: "Create Pitch",
                    });
                  }
                }}
                className="font-inter font-semibold text-base md:text-lg px-8 md:px-10 py-3 md:py-4 rounded-2xl text-white transition-all shadow-lg hover:shadow-xl text-center hover:opacity-95"
                style={{ backgroundColor: landingTheme.brown }}
              >
                Build My First Pitch
              </Link>
              <a
                href={SAMPLE_PITCH_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  if (typeof window !== "undefined" && (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag) {
                    (window as unknown as { gtag: (...a: unknown[]) => void }).gtag("event", "click", {
                      event_category: "CTA",
                      event_label: "View Sample Pitch",
                    });
                  }
                }}
                className="font-inter font-semibold text-base md:text-lg px-8 md:px-10 py-3 md:py-4 rounded-2xl border-2 text-center transition-all shadow-md bg-white hover:bg-[#EEF0F4]/80"
                style={{ borderColor: landingTheme.greyBorder, color: landingTheme.ink }}
              >
                See a Sample Pitch
              </a>
            </div>
          </div>

          {/* Horizontal marquee — min-height avoids flex min-content:0 collapse (Safari / Chrome) */}
          <div className="flex w-full flex-[2] flex-col pt-6 min-h-[max(12.5rem,32svh)] lg:hidden">
            <div className="flex min-h-[12.5rem] flex-1 flex-col sm:min-h-[14rem]">
              <HeroSkillMarqueeHorizontal left={SKILL_CARDS_LEFT} right={SKILL_CARDS_RIGHT} />
            </div>
          </div>

          {/* Desktop vertical collage */}
          <div className="hidden min-h-0 w-full min-w-0 lg:col-span-6 lg:block">
            <HeroSkillCollage left={SKILL_CARDS_LEFT} right={SKILL_CARDS_RIGHT} />
          </div>
        </div>
      </div>
    </section>
  );
}
