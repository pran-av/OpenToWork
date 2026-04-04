"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { SAMPLE_PITCH_URL } from "./landing-tokens";

const SKILL_CARDS_LEFT = [
  { src: "/landing/root_cause_analysis.svg", alt: "Root cause analysis" },
  { src: "/landing/product_strategy.svg", alt: "Product strategy" },
  { src: "/landing/databases.svg", alt: "Databases" },
];

const SKILL_CARDS_RIGHT = [
  { src: "/landing/go_to_market.svg", alt: "Go to market" },
  { src: "/landing/user_research.svg", alt: "User research" },
  { src: "/landing/prototyping.svg", alt: "Prototyping" },
];

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
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-center gap-10 lg:gap-6 xl:gap-10">
          {/* Left skill cards — desktop only */}
          <div className="hidden lg:flex flex-col gap-4 shrink-0 w-[140px] xl:w-[160px]">
            {SKILL_CARDS_LEFT.map((card) => (
              <div
                key={card.src}
                className="relative aspect-[4/3] rounded-xl border border-orange-100 bg-white/90 shadow-md overflow-hidden"
              >
                <Image
                  src={card.src}
                  alt={card.alt}
                  fill
                  className="object-contain p-2"
                  sizes="160px"
                />
              </div>
            ))}
          </div>

          {/* Center copy + CTAs */}
          <div className="flex-1 max-w-3xl mx-auto text-center space-y-6 md:space-y-8">
            <h1 className="font-poppins font-semibold text-2xl sm:text-4xl md:text-5xl text-gray-900 leading-tight">
              We Help you Pitch your Skillsets.
            </h1>
            <p className="font-inter text-base sm:text-lg md:text-xl text-[#74777F] max-w-2xl mx-auto leading-relaxed">
              Convert Your Next Job or Client using Pitch Like This.
            </p>

            {/* Mobile / tablet: skill cards row */}
            <div className="flex lg:hidden flex-wrap justify-center gap-3 max-w-md mx-auto">
              {[...SKILL_CARDS_LEFT, ...SKILL_CARDS_RIGHT].map((card) => (
                <div
                  key={card.src}
                  className="relative w-[calc(50%-6px)] sm:w-[140px] aspect-[4/3] rounded-xl border border-orange-100 bg-white/90 shadow-sm overflow-hidden"
                >
                  <Image
                    src={card.src}
                    alt={card.alt}
                    fill
                    className="object-contain p-2"
                    sizes="(max-width:640px) 45vw, 140px"
                  />
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 pt-2">
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
                className="font-inter font-semibold text-base md:text-lg px-8 md:px-10 py-3 md:py-4 rounded-lg bg-[#FF8C00] text-white hover:bg-[#E07B39] transition-all shadow-lg hover:shadow-xl text-center"
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
                className="font-inter font-semibold text-base md:text-lg px-8 md:px-10 py-3 md:py-4 rounded-lg border-2 border-[#FF8C00] text-[#FF8C00] bg-white hover:bg-orange-50 transition-all shadow-md text-center"
              >
                View Sample Pitch
              </a>
            </div>
          </div>

          {/* Right skill cards — desktop only */}
          <div className="hidden lg:flex flex-col gap-4 shrink-0 w-[140px] xl:w-[160px]">
            {SKILL_CARDS_RIGHT.map((card) => (
              <div
                key={card.src}
                className="relative aspect-[4/3] rounded-xl border border-orange-100 bg-white/90 shadow-md overflow-hidden"
              >
                <Image
                  src={card.src}
                  alt={card.alt}
                  fill
                  className="object-contain p-2"
                  sizes="160px"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
