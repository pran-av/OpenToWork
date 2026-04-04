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
    <div className="w-full max-w-xl mx-auto min-h-[240px]">
      <div className="rounded-2xl border border-orange-100 bg-white shadow-lg p-5 sm:p-6">
        <div className="flex items-end justify-between gap-2 h-40 sm:h-44 border-b border-orange-100 pb-2">
          {BARS.map((b) => (
            <div key={b.label} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
              <div
                className="w-full max-w-[48px] rounded-t-md bg-gradient-to-t from-[#E07B39] to-[#FFB800] transition-[height] duration-1000 ease-out"
                style={{ height: mounted ? `${b.h}%` : "8%" }}
              />
              <span className="font-inter text-[10px] sm:text-xs text-[#74777F] text-center">
                {b.label}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          {[
            { k: "Active", v: "128" },
            { k: "Engaged", v: "64" },
            { k: "Avg. time", v: "3m 12s" },
          ].map((row) => (
            <div key={row.k} className="rounded-lg bg-orange-50/80 border border-orange-100 py-2">
              <p className="font-poppins text-lg font-semibold text-[#FF8C00]">{row.v}</p>
              <p className="font-inter text-[10px] sm:text-xs text-[#74777F]">{row.k}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
