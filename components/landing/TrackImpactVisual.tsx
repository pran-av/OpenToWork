"use client";

import { useEffect, useState } from "react";

const BARS = [
  { label: "Visitors", h: 45 },
  { label: "Clicks", h: 72 },
  { label: "Time", h: 58 },
  { label: "Returns", h: 33 },
];

export function TrackImpactVisual() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="flex w-full flex-col items-stretch">
      <div className="mx-auto flex w-full max-w-full flex-col rounded-xl border border-orange-100 bg-white p-3 shadow-lg sm:p-4 lg:min-h-[25.5rem] lg:justify-between lg:p-5">
        <div className="flex h-[7.5rem] shrink-0 items-end justify-between gap-1.5 border-b border-orange-100 pb-1.5 sm:h-[8.25rem] sm:gap-2 lg:h-[12.5rem] lg:gap-3 lg:border-orange-100/80 lg:pb-3">
          {BARS.map((b) => (
            <div key={b.label} className="flex h-full flex-1 flex-col items-center justify-end gap-2 lg:gap-3">
              <div
                className="w-full max-w-[48px] rounded-t-md bg-gradient-to-t from-[#E07B39] to-[#FFB800] transition-[height] duration-1000 ease-out lg:max-w-[72px]"
                style={{ height: mounted ? `${b.h}%` : "8%" }}
              />
              <span className="text-center font-inter text-[10px] text-[#74777F] sm:text-xs lg:text-sm">
                {b.label}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-2 grid shrink-0 grid-cols-3 gap-1.5 text-center sm:mt-3 sm:gap-2 lg:mt-4 lg:gap-3">
          {[
            { k: "Active", v: "128" },
            { k: "Engaged", v: "64" },
            { k: "Avg. time", v: "3m 12s" },
          ].map((row) => (
            <div key={row.k} className="rounded-lg border border-orange-100 bg-orange-50/80 py-2 lg:rounded-xl lg:py-3.5">
              <p className="font-poppins text-base font-semibold text-[#FF8C00] sm:text-lg lg:text-2xl">{row.v}</p>
              <p className="font-inter text-[10px] text-[#74777F] sm:text-xs lg:text-sm">{row.k}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
