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
    <div className="w-full max-w-xl mx-auto min-h-[240px]">
      <div className="rounded-2xl border border-orange-100 bg-gradient-to-br from-white to-orange-50/40 shadow-lg p-4 sm:p-5">
        <div className="rounded-xl bg-white border border-dashed border-[#FFB800] p-4 mb-4">
          <p className="font-poppins text-sm font-semibold text-gray-900">Leave your details</p>
          <div className="mt-3 space-y-2">
            <div className="h-8 rounded-md bg-gray-100" />
            <div className="h-8 rounded-md bg-gray-100" />
            <div className="h-9 rounded-lg bg-[#FF8C00]/90 w-24 mt-2" />
          </div>
        </div>
        <p className="font-inter text-xs text-[#74777F] mb-2">Your leads (tap to highlight)</p>
        <ul className="space-y-2">
          {MOCK_LEADS.map((lead, i) => (
            <li key={lead.name}>
              <button
                type="button"
                onClick={() => setSelected(i)}
                className={`w-full text-left rounded-lg border px-3 py-2 flex justify-between items-center transition-colors ${
                  selected === i
                    ? "border-[#FF8C00] bg-orange-50"
                    : "border-orange-100 bg-white hover:border-orange-200"
                }`}
              >
                <span>
                  <span className="font-inter text-sm font-medium text-gray-900">{lead.name}</span>
                  <span className="font-inter text-xs text-[#74777F] block">{lead.role}</span>
                </span>
                <span className="font-inter text-[10px] font-semibold text-[#E07B39]">{lead.tag}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
