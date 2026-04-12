"use client";

import { HeroSkillMarqueeHorizontal } from "./HeroSkillMarqueeHorizontal";
import { HERO_SKILL_CARDS_LEFT, HERO_SKILL_CARDS_RIGHT } from "./hero-skill-cards";

/** Mobile / tablet only: horizontal skill marquee below the demo video. */
export function HeroSkillMarqueeSection() {
  return (
    <section
      className="relative z-10 w-full px-4 pb-8 pt-2 sm:px-6 sm:pb-10 sm:pt-0 lg:hidden"
      aria-label="Skill highlights"
    >
      <div className="mx-auto max-w-7xl">
        <div className="flex w-full min-h-[max(12.5rem,28svh)] flex-col">
          <div className="flex min-h-[12.5rem] flex-1 flex-col sm:min-h-[14rem]">
            <HeroSkillMarqueeHorizontal
              left={[...HERO_SKILL_CARDS_LEFT]}
              right={[...HERO_SKILL_CARDS_RIGHT]}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
