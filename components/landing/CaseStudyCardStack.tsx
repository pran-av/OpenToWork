"use client";

import { useCallback, useEffect, useState } from "react";
import { BarChart3, Clock, Users } from "lucide-react";
import { TextWithArrow } from "./TextWithArrow";

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
  if (kind === "chart") return <BarChart3 className={cls} strokeWidth={2} aria-hidden />;
  if (kind === "users") return <Users className={cls} strokeWidth={2} aria-hidden />;
  return <Clock className={cls} strokeWidth={2} aria-hidden />;
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
    <div className="relative mx-auto w-full min-w-0 max-w-full pl-1.5 pr-4 sm:pl-2 sm:pr-4 md:pl-2 md:pr-5 lg:px-0.5 xl:px-1">
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

      <div className="perspective-[1200px] relative flex min-h-[20rem] w-full max-lg:-translate-x-1 items-center justify-center py-4 pb-10 sm:min-h-[22rem] md:min-h-[23rem] lg:min-h-[26rem] lg:translate-x-0 lg:py-6 lg:pb-14">
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
              className="absolute left-1/2 top-0 w-[88%] max-w-md overflow-hidden rounded-xl border border-[#E8E4DC] bg-white shadow-[0_20px_50px_-12px_rgba(45,36,25,0.22)] transition-all duration-300 ease-out max-sm:top-2 sm:rounded-2xl lg:max-w-lg"
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
              <div className="flex h-[16.25rem] flex-col gap-y-1.5 bg-gradient-to-br from-white via-[#FFFBF2] to-orange-50/50 p-3 sm:h-[17rem] sm:gap-y-2 sm:p-4 lg:h-[20.5rem] lg:gap-y-2 lg:p-5">
                <p className="shrink-0 text-right font-poppins text-[10px] font-semibold text-[#E07B39] sm:text-xs lg:text-sm">{card.role}</p>
                <h4 className="line-clamp-2 pr-2 font-poppins text-sm font-semibold leading-snug text-[#2C2419] sm:text-base lg:text-lg">
                  {card.title}
                </h4>
                <p className="line-clamp-2 shrink-0 font-inter text-[10px] leading-relaxed text-[#74777F] sm:text-xs lg:text-sm">
                  {card.description}
                </p>

                {/* One row of three metrics on all breakpoints — avoids mobile overlap with description */}
                <div className="mt-auto grid min-h-0 w-full flex-1 grid-cols-3 content-end gap-1 sm:gap-2 lg:gap-3">
                  {card.metrics.map((m) => (
                    <div
                      key={m.label}
                      className="flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-md border border-[#E8E4DC] bg-white/90 px-1 py-1.5 text-center shadow-sm max-sm:py-2 sm:gap-1.5 sm:rounded-lg sm:px-2 sm:py-3 lg:rounded-xl lg:px-3 lg:py-4"
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FFFBF2] ring-1 ring-[#E8E4DC] sm:h-9 sm:w-9 lg:h-11 lg:w-11">
                        <MetricIcon kind={m.icon} />
                      </div>
                      <div className="min-w-0 text-center">
                        <TextWithArrow
                          text={m.label}
                          className="font-inter text-[9px] font-medium uppercase tracking-wide text-[#74777F] sm:text-[10px] lg:text-xs"
                          iconClassName="h-3 w-3 shrink-0 text-[#74777F] opacity-90 sm:h-3.5 sm:w-3.5 lg:h-3.5 lg:w-3.5"
                        />
                        <p className="line-clamp-2 font-poppins text-[10px] font-semibold leading-tight text-[#2C2419] sm:text-sm lg:text-base">
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
