"use client";

import { landingTheme } from "./landing-tokens";

/** ~10px fade on left / right */
const MASK_X =
  "linear-gradient(to right, transparent 0px, black 10px, black calc(100% - 10px), transparent 100%)";

type Card = { src: string; alt: string };

type Props = {
  left: Card[];
  right: Card[];
};

/**
 * Mobile / tablet: horizontal infinite marquee, interleaved columns, vertical stagger.
 * Left/right edge fade + blur (cream).
 */
export function HeroSkillMarqueeHorizontal({ left, right }: Props) {
  const cream = landingTheme.cream;
  const interleaved: Card[] = left.flatMap((l, i) => [l, right[i] as Card]);
  const loop = [...interleaved, ...interleaved];
  const durationSec = 96;

  return (
    <div className="relative isolate flex h-full min-h-[12rem] w-full flex-1">
      <div
        className="absolute inset-0 overflow-hidden rounded-xl"
        style={{
          maskImage: MASK_X,
          WebkitMaskImage: MASK_X,
          maskSize: "100% 100%",
          WebkitMaskSize: "100% 100%",
        }}
      >
        <div
          className="hero-skill-marquee-x-track flex h-full min-h-0 flex-row flex-nowrap items-center gap-2 sm:gap-3 will-change-transform"
          style={{
            animation: `hero-skill-marquee-x ${durationSec}s linear infinite`,
            width: "max-content",
          }}
        >
          {loop.map((card, i) => (
            <div
              key={`${card.src}-${i}`}
              className={[
                "flex h-full min-h-0 w-auto shrink-0 items-center justify-center leading-none aspect-[2/3]",
                i % 2 === 1 ? "translate-y-1 sm:translate-y-1.5" : "-translate-y-1 sm:-translate-y-1.5",
              ].join(" ")}
            >
              <img
                src={card.src}
                alt={card.alt}
                width={300}
                height={450}
                className="block h-full w-full object-contain object-center pointer-events-none select-none"
                loading={i < interleaved.length ? "eager" : "lazy"}
                decoding="async"
              />
            </div>
          ))}
        </div>
      </div>

      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-[2] w-2 backdrop-blur-[2px]"
        style={{
          background: `linear-gradient(to right, ${cream} 0%, rgba(255, 251, 242, 0.5) 70%, transparent 100%)`,
        }}
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-[2] w-2 backdrop-blur-[2px]"
        style={{
          background: `linear-gradient(to left, ${cream} 0%, rgba(255, 251, 242, 0.5) 70%, transparent 100%)`,
        }}
      />
    </div>
  );
}
