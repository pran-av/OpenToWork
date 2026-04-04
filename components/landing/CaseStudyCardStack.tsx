"use client";

import { useCallback, useEffect, useState } from "react";

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
  const cls = "h-5 w-5 text-[#5D4A3A] shrink-0";
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    let id: number | undefined;

    const arm = () => {
      if (id !== undefined) {
        clearInterval(id);
        id = undefined;
      }
      if (mq.matches) return;
      id = window.setInterval(() => {
        setActive((i) => (i + 1) % n);
      }, 3000);
    };

    arm();
    mq.addEventListener("change", arm);
    return () => {
      mq.removeEventListener("change", arm);
      if (id !== undefined) clearInterval(id);
    };
  }, [n]);

  return (
    <div className="relative mx-auto h-full min-h-0 w-full max-w-xl px-2 sm:px-4">
      <button
        type="button"
        aria-label="Show previous case study"
        className="absolute bottom-0 left-0 top-0 z-30 w-[28%] cursor-w-resize rounded-l-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF8C00]"
        onClick={prev}
      />
      <button
        type="button"
        aria-label="Show next case study"
        className="absolute bottom-0 right-0 top-0 z-30 w-[28%] cursor-e-resize rounded-r-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF8C00]"
        onClick={next}
      />

      <div className="perspective-[1200px] relative flex h-full min-h-[min(300px,48svh)] w-full items-center justify-center sm:min-h-[300px] md:min-h-[280px]">
        {CASE_STUDIES.map((card, i) => {
          const offset = (i - active + n) % n;
          const isFront = offset === 0;
          const depth = offset;

          /* Deck offset; horizontal nudge scales down on narrow viewports in CSS via smaller multiplier */
          const translateX = depth * 20;
          const translateY = depth * 10;
          const scale = 1 - depth * 0.045;
          const rotateY = depth === 0 ? 0 : -5 - depth * 2;
          const opacity =
            depth === 0 ? 1 : depth === 1 ? 0.92 : depth === 2 ? 0.78 : Math.max(0.5, 0.72 - depth * 0.08);
          const z = 20 - depth;

          return (
            <article
              key={card.id}
              className="absolute left-1/2 top-0 w-[90%] max-w-lg overflow-hidden rounded-2xl border border-[#E8E4DC] bg-white shadow-[0_20px_50px_-12px_rgba(45,36,25,0.22)] transition-all duration-300 ease-out max-sm:top-3"
              style={{
                transform: `translateX(calc(-50% + ${translateX}px)) translateY(${translateY}px) scale(${scale}) rotateY(${rotateY}deg)`,
                zIndex: z,
                opacity,
                pointerEvents: isFront ? "auto" : "none",
                boxShadow:
                  depth > 0
                    ? `0 ${8 + depth * 4}px ${24 + depth * 8}px -8px rgba(45,36,25,${0.12 + depth * 0.04})`
                    : undefined,
              }}
            >
              <div className="flex min-h-[240px] flex-col bg-gradient-to-br from-white via-[#FFFBF2] to-orange-50/50 p-4 sm:p-5 sm:min-h-[268px] md:min-h-[288px]">
                <p className="text-right font-poppins text-xs font-semibold text-[#E07B39] sm:text-sm">{card.role}</p>
                <h4 className="mt-1 pr-4 font-poppins text-base font-semibold leading-snug text-[#2C2419] sm:text-lg">
                  {card.title}
                </h4>
                <p className="font-inter mt-2 line-clamp-2 text-xs leading-relaxed text-[#74777F] sm:text-sm">
                  {card.description}
                </p>

                {/* Metrics — stacked rows on mobile, 3 columns from sm */}
                <div className="mt-4 grid min-h-0 flex-1 grid-cols-1 gap-2 sm:mt-5 sm:grid-cols-3 sm:gap-3">
                  {card.metrics.map((m) => (
                    <div
                      key={m.label}
                      className="flex flex-row items-center gap-3 rounded-xl border border-[#E8E4DC] bg-white/90 px-3 py-3 text-left shadow-sm sm:flex-col sm:items-center sm:justify-center sm:gap-2 sm:px-3 sm:py-5 sm:text-center"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FFFBF2] ring-1 ring-[#E8E4DC] sm:h-12 sm:w-12">
                        <MetricIcon kind={m.icon} />
                      </div>
                      <div className="min-w-0 flex-1 sm:flex-none sm:text-center">
                        <p className="font-inter text-[10px] font-medium uppercase tracking-wide text-[#74777F] sm:text-[11px]">
                          {m.label}
                        </p>
                        <p className="font-poppins text-sm font-semibold leading-tight text-[#2C2419] sm:text-base">
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
    </div>
  );
}
