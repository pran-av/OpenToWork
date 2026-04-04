"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { SAMPLE_PITCH_URL, landingTheme } from "./landing-tokens";

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

function SkillTile({ src, alt }: { src: string; alt: string }) {
  /* PNGs were mislabeled as .svg; use native img so dimensions stay reliable. */
  return (
    <div className="rounded-2xl border border-[#E8E4DC] bg-white shadow-md overflow-hidden flex items-center justify-center aspect-[4/3] p-2">
      <img
        src={src}
        alt={alt}
        width={300}
        height={450}
        className="max-h-full w-auto max-w-full object-contain"
        loading="eager"
        decoding="async"
      />
    </div>
  );
}

function SkillFan({ cards }: { cards: { src: string; alt: string }[] }) {
  return (
    <div className="relative h-[min(420px,55vw)] w-full max-w-[280px] mx-auto lg:mx-0 lg:max-w-none">
      {cards.map((card, i) => (
        <div
          key={card.src}
          className="absolute w-[min(200px,42%)] rounded-2xl border border-[#E8E4DC] bg-white shadow-lg overflow-hidden p-2 flex items-center justify-center"
          style={{
            right: `${8 + i * 18}px`,
            top: `${12 + i * 36}px`,
            transform: `rotate(${-3 + i * 2.5}deg)`,
            zIndex: 10 - i,
          }}
        >
          <img
            src={card.src}
            alt={card.alt}
            width={300}
            height={450}
            className="w-full h-auto object-contain max-h-[120px] sm:max-h-[140px]"
            loading="eager"
            decoding="async"
          />
        </div>
      ))}
    </div>
  );
}

export function HeroSection() {
  const [authUrl, setAuthUrl] = useState("/auth");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setAuthUrl(`${window.location.origin}/auth`);
    }
  }, []);

  return (
    <section className="relative z-10 pt-24 md:pt-28 pb-16 md:pb-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 xl:gap-12 items-center">
          {/* Left skill column — desktop */}
          <div className="hidden lg:flex flex-col gap-3 xl:gap-4 lg:col-span-2">
            {SKILL_CARDS_LEFT.map((card) => (
              <SkillTile key={card.src} src={card.src} alt={card.alt} />
            ))}
          </div>

          {/* Copy + CTAs */}
          <div className="lg:col-span-5 xl:col-span-5 space-y-6 md:space-y-8 text-center lg:text-left">
            <h1
              className="font-poppins font-semibold text-3xl sm:text-4xl md:text-5xl leading-tight"
              style={{ color: landingTheme.ink }}
            >
              We Help you Pitch your Skillsets.
            </h1>
            <p
              className="font-inter text-base sm:text-lg md:text-xl leading-relaxed max-w-xl mx-auto lg:mx-0"
              style={{ color: landingTheme.muted }}
            >
              Convert Your Next Job or Client using Pitch Like This.
            </p>

            <div className="flex lg:hidden flex-wrap justify-center gap-3 max-w-lg mx-auto">
              {[...SKILL_CARDS_LEFT, ...SKILL_CARDS_RIGHT].map((card) => (
                <div key={card.src} className="w-[calc(50%-6px)] sm:w-[140px]">
                  <SkillTile src={card.src} alt={card.alt} />
                </div>
              ))}
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
                Create Pitch
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
                View Sample Pitch
              </a>
            </div>
          </div>

          {/* Right fan — desktop */}
          <div className="hidden lg:block lg:col-span-5 xl:col-span-5">
            <SkillFan cards={SKILL_CARDS_RIGHT} />
          </div>
        </div>
      </div>
    </section>
  );
}
