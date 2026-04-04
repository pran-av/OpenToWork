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
    <div className="relative w-full max-w-xl mx-auto min-h-[240px] flex items-center justify-center">
      <div className="relative w-full aspect-[16/10] rounded-2xl border border-orange-100 bg-gradient-to-br from-white via-orange-50/30 to-[#FFB800]/10 shadow-lg overflow-hidden p-6">
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className={`flex gap-2 transition-all duration-700 ease-in-out ${
              phase >= 2 ? "opacity-0 scale-75 blur-sm" : "opacity-100 scale-100"
            }`}
          >
            {["Story A", "Story B", "Story C"].map((label, i) => (
              <div
                key={label}
                className="w-20 sm:w-24 h-28 sm:h-32 rounded-lg bg-white border border-orange-200 shadow-md flex items-end justify-center pb-2 font-inter text-[10px] sm:text-xs font-medium text-[#74777F]"
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
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2 rounded-full bg-white border-2 border-[#FF8C00] px-4 py-2 shadow-md">
              <span className="font-inter text-xs sm:text-sm text-[#74777F] truncate max-w-[200px] sm:max-w-none">
                pitchlikethis.com/pitch/••••••
              </span>
              <span className="text-[#FF8C00] font-inter text-xs font-semibold shrink-0">Copy</span>
            </div>
            <p className="font-inter text-xs text-[#74777F] text-center max-w-xs">
              One shareable link for hiring managers and founders
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
