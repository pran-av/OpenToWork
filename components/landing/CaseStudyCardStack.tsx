"use client";

import { useCallback, useState } from "react";

type CaseStudy = {
  id: string;
  role: string;
  title: string;
  description: string;
  metrics: { label: string; value: string; icon: "chart" | "users" | "clock" }[];
};

const CASE_STUDIES: CaseStudy[] = [
  {
    id: "1",
    role: "Senior PM",
    title: "Launch readiness in six weeks",
    description:
      "Aligned stakeholders on scope, shipped a beta, and cut time-to-feedback in half for the core journey.",
    metrics: [
      { label: "Revenue impact", value: "+18% activation", icon: "chart" },
      { label: "Teams", value: "4 squads", icon: "users" },
      { label: "Timeline", value: "6 weeks", icon: "clock" },
    ],
  },
  {
    id: "2",
    role: "Product Designer",
    title: "Design system adoption",
    description:
      "Built tokens and components so product teams shipped consistent UI without blocking on design for every screen.",
    metrics: [
      { label: "Build time", value: "-32%", icon: "clock" },
      { label: "Coverage", value: "40+ screens", icon: "chart" },
      { label: "Contributors", value: "12", icon: "users" },
    ],
  },
  {
    id: "3",
    role: "Engineering Lead",
    title: "Reliability under load",
    description:
      "Hardened APIs and caching so peak traffic stayed under SLOs during the biggest campaign of the year.",
    metrics: [
      { label: "Uptime", value: "99.95%", icon: "chart" },
      { label: "Latency", value: "-40% p95", icon: "clock" },
      { label: "Incidents", value: "0 sev-1", icon: "users" },
    ],
  },
  {
    id: "4",
    role: "Founding PMM",
    title: "Self-serve conversion",
    description:
      "Rewrote onboarding and in-product hints so trials converted without expanding the sales team.",
    metrics: [
      { label: "Trial → paid", value: "+2.1pp", icon: "chart" },
      { label: "Support tickets", value: "-22%", icon: "users" },
      { label: "Cycle", value: "1 quarter", icon: "clock" },
    ],
  },
];

function MetricIcon({ kind }: { kind: "chart" | "users" | "clock" }) {
  const cls = "w-4 h-4 text-[#FF8C00] shrink-0";
  if (kind === "chart") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 3v18h18" />
        <path d="M7 16l4-6 4 3 5-8" />
      </svg>
    );
  }
  if (kind === "users") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    );
  }
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

export function CaseStudyCardStack() {
  const [active, setActive] = useState(0);
  const n = CASE_STUDIES.length;

  const prev = useCallback(() => {
    setActive((i) => (i - 1 + n) % n);
  }, [n]);

  const next = useCallback(() => {
    setActive((i) => (i + 1) % n);
  }, [n]);

  return (
    <div className="relative w-full max-w-xl mx-auto min-h-[260px] sm:min-h-[280px] mb-6 sm:mb-10">
      <button
        type="button"
        aria-label="Show previous case study"
        className="absolute left-0 top-0 bottom-0 w-[28%] z-30 cursor-w-resize rounded-l-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF8C00]"
        onClick={prev}
      />
      <button
        type="button"
        aria-label="Show next case study"
        className="absolute right-0 top-0 bottom-0 w-[28%] z-30 cursor-e-resize rounded-r-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF8C00]"
        onClick={next}
      />

      <div className="absolute inset-0 flex items-center justify-center perspective-[1000px]">
        {CASE_STUDIES.map((card, i) => {
          const offset = (i - active + n) % n;
          const isFront = offset === 0;
          const depth = offset;
          const translateX = depth === 0 ? 0 : depth === 1 ? 14 : depth === 2 ? 26 : 34;
          const translateY = depth * 5;
          const scale = 1 - depth * 0.04;
          const rotateY = depth === 0 ? 0 : -6;
          const opacity = depth > 2 ? 0.35 : 0.55 + (3 - depth) * 0.15;
          const z = 20 - depth;

          return (
            <article
              key={card.id}
              className="absolute w-[92%] max-w-lg rounded-xl border-2 border-orange-100 bg-white shadow-xl overflow-hidden transition-all duration-300 ease-out"
              style={{
                transform: `translateX(${translateX}px) translateY(${translateY}px) scale(${scale}) rotateY(${rotateY}deg)`,
                zIndex: z,
                opacity: isFront ? 1 : opacity,
                pointerEvents: isFront ? "auto" : "none",
              }}
            >
              <div className="relative aspect-[16/10] flex flex-col p-4 sm:p-5 bg-gradient-to-br from-white to-orange-50/40">
                <p className="font-poppins text-xs sm:text-sm font-semibold text-[#E07B39] text-right">
                  {card.role}
                </p>
                <h4 className="font-poppins font-semibold text-base sm:text-lg text-gray-900 mt-1 pr-16 sm:pr-24">
                  {card.title}
                </h4>
                <p className="font-inter text-xs sm:text-sm text-[#74777F] mt-2 line-clamp-3 flex-1">
                  {card.description}
                </p>
                <div className="flex flex-wrap gap-2 sm:gap-3 mt-3 pt-3 border-t border-orange-100">
                  {card.metrics.map((m) => (
                    <div
                      key={m.label}
                      className="flex items-center gap-1.5 rounded-lg bg-white/90 border border-orange-100 px-2 py-1"
                    >
                      <MetricIcon kind={m.icon} />
                      <div className="leading-tight">
                        <p className="font-inter text-[10px] sm:text-xs text-[#74777F]">{m.label}</p>
                        <p className="font-inter text-[11px] sm:text-sm font-semibold text-gray-800">
                          {m.value}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <p className="absolute -bottom-8 left-0 right-0 text-center font-inter text-xs text-[#74777F] hidden sm:block">
        Click the left or right side of the stack to rotate stories
      </p>
    </div>
  );
}
