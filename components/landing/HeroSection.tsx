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

/** One cell in the collage: fills an equal slice of column height, image flush (no gaps). */
function CollageImage({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="flex-1 min-h-0 min-w-0 overflow-hidden flex items-stretch justify-center">
      <img
        src={src}
        alt={alt}
        width={300}
        height={450}
        className="block h-full w-full min-h-0 object-contain object-center pointer-events-none"
        loading="eager"
        decoding="async"
      />
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

  const imageColumns = (
    <div
      className={[
        "flex gap-0 w-full max-w-[280px] sm:max-w-[300px] mx-auto lg:mx-0 lg:ml-auto",
        "h-[min(22rem,52svh)] max-h-[22rem]",
        "sm:h-[min(24rem,54svh)] sm:max-h-[24rem]",
        "lg:h-[min(31rem,calc(100svh-9.5rem))] lg:max-h-[31rem]",
      ].join(" ")}
    >
      <div className="flex flex-1 flex-col gap-0 min-h-0 min-w-0">
        {SKILL_CARDS_LEFT.map((card) => (
          <CollageImage key={card.src} src={card.src} alt={card.alt} />
        ))}
      </div>
      <div className="flex flex-1 flex-col gap-0 min-h-0 min-w-0">
        {SKILL_CARDS_RIGHT.map((card) => (
          <CollageImage key={card.src} src={card.src} alt={card.alt} />
        ))}
      </div>
    </div>
  );

  return (
    <section className="relative z-10 pt-24 md:pt-28 pb-16 md:pb-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 xl:gap-12 items-center">
          {/* Copy + CTAs */}
          <div className="lg:col-span-6 space-y-6 md:space-y-8 text-center lg:text-left">
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

          {/* Collage: two columns, images edge-to-edge, height-capped to hero */}
          <div className="lg:col-span-6">{imageColumns}</div>
        </div>
      </div>
    </section>
  );
}
