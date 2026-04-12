"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { useState, useEffect } from "react";
import { landingTheme } from "./landing-tokens";
import { HeroSkillCollage } from "./HeroSkillCollage";
import { HERO_SKILL_CARDS_LEFT, HERO_SKILL_CARDS_RIGHT } from "./hero-skill-cards";

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
    <section
      id="hero"
      className="relative z-10 scroll-mt-28 px-4 pb-8 pt-28 sm:px-6 sm:pb-10 sm:pt-28 md:pb-12 md:pt-32 lg:scroll-mt-32 lg:px-8 lg:pb-24 lg:pt-28"
    >
      <div className="max-w-7xl mx-auto">
        {/* Mobile / tablet: natural height so demo video can sit on first screen; lg+: full-height grid */}
        <div className="flex min-h-0 flex-col items-stretch lg:grid lg:min-h-[calc(100svh-5.5rem)] lg:grid-cols-12 lg:gap-8 xl:gap-12 lg:items-center">
          {/* Copy + CTAs — full column on small screens (marquee lives below demo video) */}
          <div className="flex min-h-0 flex-col justify-center space-y-5 text-center md:space-y-6 lg:col-span-6 lg:flex-none lg:space-y-8 lg:text-left">
            <div className="space-y-3.5 md:space-y-5">
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

            <div className="mx-auto flex w-full min-w-0 max-w-md flex-col items-stretch gap-2 pt-2 sm:max-w-lg lg:mx-0 lg:w-fit lg:max-w-[min(100%,26rem)]">
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
                className="inline-flex w-full min-w-0 items-center justify-center rounded-2xl px-6 py-3 font-inter text-base font-semibold text-white shadow-lg transition-all hover:shadow-xl hover:opacity-95 sm:px-9 sm:py-3.5 sm:text-lg md:px-10 md:py-4 md:text-lg lg:w-auto lg:min-w-[14rem]"
                style={{ backgroundColor: landingTheme.brown }}
              >
                Build My First Pitch
              </Link>
              <p
                className="flex min-w-0 gap-1.5 text-left text-xs leading-snug sm:text-sm"
                style={{ color: landingTheme.muted }}
              >
                <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" strokeWidth={2} aria-hidden />
                <span className="min-w-0 break-words">Private by default. Share only when you&apos;re ready.</span>
              </p>
            </div>
          </div>

          {/* Desktop vertical collage */}
          <div className="hidden min-h-0 w-full min-w-0 lg:col-span-6 lg:block">
            <HeroSkillCollage
              left={[...HERO_SKILL_CARDS_LEFT]}
              right={[...HERO_SKILL_CARDS_RIGHT]}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
