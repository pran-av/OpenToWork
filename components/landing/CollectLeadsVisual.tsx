"use client";

import { useState } from "react";

const MOCK_LEADS = [
  { name: "Alex M.", role: "Hiring Manager", tag: "New" },
  { name: "Jordan K.", role: "Founder", tag: "Viewed 2×" },
  { name: "Sam R.", role: "VP Product", tag: "Saved" },
];

export function CollectLeadsVisual() {
  const [selected, setSelected] = useState(0);

  return (
    <div className="flex w-full flex-col items-stretch">
      <div className="mx-auto flex w-full max-w-full flex-col rounded-xl border border-orange-100 bg-gradient-to-br from-white to-orange-50/40 p-3 shadow-lg sm:p-4 lg:min-h-[25.5rem] lg:justify-between lg:p-5">
        <div className="mb-2 rounded-lg border border-dashed border-[#FFB800] bg-white p-2.5 sm:p-3 lg:mb-3 lg:p-4">
          <p className="font-poppins text-xs font-semibold text-gray-900 sm:text-sm lg:text-base">Leave your details</p>
          <div className="mt-2 space-y-1.5 lg:mt-3 lg:space-y-2">
            <div className="h-6 rounded-md bg-gray-100 sm:h-7 lg:h-9" />
            <div className="h-6 rounded-md bg-gray-100 sm:h-7 lg:h-9" />
            <div className="mt-1.5 h-7 w-20 rounded-lg bg-[#FF8C00]/90 sm:h-8 lg:mt-2 lg:h-10 lg:w-28" />
          </div>
        </div>
        <p className="mb-1 font-inter text-[10px] text-[#74777F] sm:text-xs lg:mb-2 lg:text-sm">Your recruiters (tap to highlight)</p>
        <ul className="space-y-1.5 sm:space-y-2 lg:space-y-2.5">
          {MOCK_LEADS.map((lead, i) => (
            <li key={lead.name}>
              <button
                type="button"
                onClick={() => setSelected(i)}
                className={`flex w-full items-center justify-between rounded-lg border px-2 py-1.5 text-left transition-colors sm:px-3 sm:py-2 lg:rounded-xl lg:px-4 lg:py-3 ${
                  selected === i
                    ? "border-[#FF8C00] bg-orange-50"
                    : "border-orange-100 bg-white hover:border-orange-200"
                }`}
              >
                <span>
                  <span className="font-inter text-sm font-medium text-gray-900 lg:text-base">{lead.name}</span>
                  <span className="font-inter text-xs text-[#74777F] block lg:text-sm">{lead.role}</span>
                </span>
                <span className="font-inter text-[10px] font-semibold text-[#E07B39] lg:text-xs">{lead.tag}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
