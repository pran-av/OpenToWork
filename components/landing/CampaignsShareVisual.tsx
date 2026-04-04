"use client";

import { useEffect, useState } from "react";

/**
 * Interactive hint for “share as a one-time link” — animated campaign tiles collapsing into a link chip.
 */
export function CampaignsShareVisual() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t = window.setInterval(() => setPhase((p) => (p + 1) % 4), 2200);
    return () => window.clearInterval(t);
  }, []);

  return (
    <div className="relative mx-auto flex w-full max-w-xl min-h-[220px] items-center justify-center md:max-w-[13rem] md:min-h-[200px] lg:max-w-[15rem] xl:max-w-[16rem]">
      <div className="relative aspect-[16/10] w-full max-w-full rounded-2xl border border-orange-100 bg-gradient-to-br from-white via-orange-50/30 to-[#FFB800]/10 p-4 shadow-lg overflow-hidden md:p-3.5 lg:p-4">
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className={`flex gap-1.5 transition-all duration-700 ease-in-out md:gap-1 ${
              phase >= 2 ? "opacity-0 scale-75 blur-sm" : "opacity-100 scale-100"
            }`}
          >
            {["Story A", "Story B", "Story C"].map((label, i) => (
              <div
                key={label}
                className="flex h-24 w-16 items-end justify-center rounded-lg border border-orange-200 bg-white pb-1.5 font-inter text-[9px] font-medium text-[#74777F] shadow-md sm:h-28 sm:w-20 sm:pb-2 sm:text-[10px] md:h-20 md:w-[2.65rem] md:text-[8px] lg:h-24 lg:w-14 lg:text-[9px]"
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
          className={`absolute inset-0 flex items-center justify-center transition-all duration-700 ${
            phase >= 2 ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="flex flex-col items-center gap-2 px-1 md:gap-1.5">
            <div className="flex w-full max-w-[13rem] items-center gap-1.5 rounded-full border-2 border-[#FF8C00] bg-white px-2.5 py-1.5 shadow-md md:max-w-[11.5rem] md:px-2 md:py-1 lg:max-w-[13rem]">
              <span className="min-w-0 flex-1 truncate font-inter text-[10px] text-[#74777F] sm:text-xs md:text-[9px] lg:text-[10px]">
                pitchlikethis.com/pitch/••••••
              </span>
              <span className="shrink-0 font-inter text-[10px] font-semibold text-[#FF8C00] md:text-[9px] lg:text-[10px]">
                Copy
              </span>
            </div>
            <p className="max-w-[12rem] text-center font-inter text-[10px] leading-snug text-[#74777F] sm:text-xs md:max-w-[11rem] md:text-[9px] lg:max-w-[12rem] lg:text-[10px]">
              One shareable link for hiring managers and founders
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
