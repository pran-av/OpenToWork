"use client";

import { landingTheme } from "./landing-tokens";

/** ~8px fade at top/bottom regardless of container height */
const MASK =
  "linear-gradient(to bottom, transparent 0px, black 8px, black calc(100% - 8px), transparent 100%)";

type Card = { src: string; alt: string };

type ScrollingColumnProps = {
  cards: Card[];
  durationSec: number;
  delaySec: number;
};

function ScrollingColumn({ cards, durationSec, delaySec }: ScrollingColumnProps) {
  const loop = [...cards, ...cards];

  return (
    <div className="relative flex-1 min-w-0 h-full overflow-hidden">
      <div
        className="hero-skill-marquee-track flex flex-col gap-0 will-change-transform"
        style={{
          animation: `hero-skill-marquee ${durationSec}s linear infinite`,
          animationDelay: `${delaySec}s`,
        }}
      >
        {loop.map((card, i) => (
          <div
            key={`${card.src}-${i}`}
            className="w-full shrink-0 aspect-[2/3] overflow-hidden flex items-center justify-center leading-none"
          >
            <img
              src={card.src}
              alt={card.alt}
              width={300}
              height={450}
              className="block w-full h-full object-contain object-center pointer-events-none select-none"
              loading={i < cards.length ? "eager" : "lazy"}
              decoding="async"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

type Props = {
  left: Card[];
  right: Card[];
};

/**
 * Two staggered vertical marquees with feathered top/bottom edges (mask + frosted overlays).
 */
export function HeroSkillCollage({ left, right }: Props) {
  const cream = landingTheme.cream;

  return (
    <div
      className={[
        "relative w-full mx-auto lg:mx-0",
        "h-[min(58svh,calc(100svh-10rem))] min-h-[18rem]",
        "sm:min-h-[20rem] sm:h-[min(62svh,calc(100svh-9.5rem))]",
        "lg:h-[calc(100svh-7.5rem)] lg:min-h-[28rem] lg:max-h-none",
        "isolate",
      ].join(" ")}
    >
      <div
        className="absolute inset-0 overflow-hidden rounded-xl sm:rounded-2xl"
        style={{
          maskImage: MASK,
          WebkitMaskImage: MASK,
          maskSize: "100% 100%",
          WebkitMaskSize: "100% 100%",
        }}
      >
        <div className="flex h-full w-full gap-2 sm:gap-3 lg:gap-4">
          <ScrollingColumn cards={left} durationSec={96} delaySec={0} />
          <ScrollingColumn cards={right} durationSec={96} delaySec={-48} />
        </div>
      </div>

      {/* Top / bottom: narrow strip — a few px of fade + light blur at the edge */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-[2] h-2 backdrop-blur-[2px]"
        style={{
          background: `linear-gradient(to bottom, ${cream} 0%, rgba(255, 251, 242, 0.45) 70%, transparent 100%)`,
        }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-2 backdrop-blur-[2px]"
        style={{
          background: `linear-gradient(to top, ${cream} 0%, rgba(255, 251, 242, 0.45) 70%, transparent 100%)`,
        }}
      />
    </div>
  );
}
