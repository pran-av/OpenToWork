"use client";

import { useEffect, useState } from "react";

/**
 * Terminology guard (UI copy only): keep these user-facing terms stable.
 * - Project -> Application
 * - Campaign -> Pitch
 * - Lead -> Recruiter
 * Do not rename internal routes/types/identifiers from this comment.
 *
 * Interactive hint for “share as a one-time link” — animated pitch tiles collapsing into a link chip.
 */
export function CampaignsShareVisual() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t = window.setInterval(() => setPhase((p) => (p + 1) % 4), 2200);
    return () => window.clearInterval(t);
  }, []);

  return (
    <div className="flex w-full justify-center">
      <div className="relative aspect-[16/10] w-full max-w-md overflow-hidden rounded-xl border border-orange-100 bg-gradient-to-br from-white via-orange-50/30 to-[#FFB800]/10 shadow-lg sm:max-w-lg lg:aspect-auto lg:min-h-[25.5rem] lg:max-w-[28rem] lg:rounded-2xl">
        <div className="absolute inset-0 flex items-center justify-center p-3 sm:p-4 lg:p-6">
          <div
            className={`flex gap-1.5 transition-all duration-700 ease-in-out sm:gap-2 lg:gap-4 ${
              phase >= 2 ? "opacity-0 scale-75 blur-sm" : "opacity-100 scale-100"
            }`}
          >
            {["Story A", "Story B", "Story C"].map((label, i) => (
              <div
                key={label}
                className="flex h-[4.5rem] w-14 items-end justify-center rounded-lg border border-orange-200 bg-white pb-1 font-inter text-[8px] font-medium text-[#74777F] shadow-md sm:h-[5.25rem] sm:w-16 sm:pb-1.5 sm:text-[9px] lg:h-32 lg:w-[4.5rem] lg:pb-2 lg:text-xs"
                style={{
                  transform: `translateY(${i === 1 ? -8 : 0}px) rotate(${i === 0 ? -4 : i === 2 ? 4 : 0}deg)`,
                }}
              >
                {label}
              </div>
            ))}
          </div>
        </div>

        <div
          className={`absolute inset-0 flex items-center justify-center p-3 transition-all duration-700 sm:p-4 lg:p-6 ${
            phase >= 2 ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="flex flex-col items-center gap-1.5 px-1 sm:gap-2 lg:gap-3">
            <div className="flex w-full max-w-[14rem] items-center gap-1.5 rounded-full border-2 border-[#FF8C00] bg-white px-2.5 py-1.5 shadow-md sm:max-w-[16rem] lg:max-w-[20rem] lg:px-4 lg:py-2.5">
              <span className="min-w-0 flex-1 truncate font-inter text-[9px] text-[#74777F] sm:text-[10px] lg:text-xs">
                pitchlikethis.com/pitch/••••••
              </span>
              <span className="shrink-0 font-inter text-[9px] font-semibold text-[#FF8C00] sm:text-[10px] lg:text-sm">
                Copy
              </span>
            </div>
            <p className="max-w-[14rem] text-center font-inter text-[9px] leading-snug text-[#74777F] sm:max-w-[16rem] sm:text-[10px] lg:max-w-[20rem] lg:text-sm">
              One shareable link for hiring managers and founders
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
