"use client";

import { useState } from "react";

const CAMPAIGNS = [
  { id: "c1", name: "Backend depth", active: true },
  { id: "c2", name: "Product sense", active: false },
  { id: "c3", name: "0→1 story", active: false },
];

export function OrganiseCampaignsVisual() {
  const [items, setItems] = useState(CAMPAIGNS);

  const toggle = (id: string) => {
    setItems((prev) => {
      const next = prev.map((c) => ({ ...c, active: c.id === id }));
      return next;
    });
  };

  const active = items.find((c) => c.active);

  return (
    <div className="w-full max-w-xl mx-auto min-h-[240px]">
      <div className="rounded-2xl border border-orange-100 bg-white shadow-lg p-5 sm:p-6">
        <p className="font-inter text-xs text-[#74777F] mb-3">Project: “Principal PM — Fintech”</p>
        <p className="font-poppins text-sm font-semibold text-gray-900 mb-3">Tap a campaign to make it active on your link</p>
        <ul className="space-y-2">
          {items.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => toggle(c.id)}
                className={`w-full flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-all ${
                  c.active
                    ? "border-[#FF8C00] bg-orange-50 shadow-sm"
                    : "border-orange-100 bg-gray-50/80 hover:border-orange-200"
                }`}
              >
                <span className="font-inter text-sm font-medium text-gray-800">{c.name}</span>
                <span
                  className={`font-inter text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded ${
                    c.active ? "bg-[#FF8C00] text-white" : "bg-gray-200 text-[#74777F]"
                  }`}
                >
                  {c.active ? "Active" : "Inactive"}
                </span>
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-4 rounded-lg bg-[#74777F]/10 px-3 py-2">
          <p className="font-inter text-xs text-[#74777F]">
            Shared link shows: <span className="font-semibold text-gray-800">{active?.name ?? "—"}</span> — no new URL when you switch.
          </p>
        </div>
      </div>
    </div>
  );
}
