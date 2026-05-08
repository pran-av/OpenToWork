"use client";

import { useState } from "react";
import { TextWithArrow } from "./TextWithArrow";

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
    <div className="flex w-full flex-col items-stretch">
      <div className="mx-auto flex w-full max-w-full flex-col rounded-xl border border-orange-100 bg-white p-3 shadow-lg sm:p-4 lg:min-h-[25.5rem] lg:justify-between lg:p-5">
        <div>
          <p className="mb-1.5 font-inter text-[10px] text-[#74777F] sm:text-xs lg:mb-2 lg:text-sm">
            Application: “Principal PM — Fintech”
          </p>
          <p className="mb-2 font-poppins text-xs font-semibold text-gray-900 sm:mb-3 sm:text-sm lg:mb-4 lg:text-base">
            Tap a pitch to make it active on your link
          </p>
          <ul className="space-y-1.5 sm:space-y-2 lg:space-y-2.5">
            {items.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => toggle(c.id)}
                  className={`flex w-full items-center justify-between rounded-lg border px-2.5 py-2 text-left transition-all sm:rounded-xl sm:px-4 sm:py-3 lg:rounded-xl lg:px-5 lg:py-4 ${
                    c.active
                      ? "border-[#FF8C00] bg-orange-50 shadow-sm"
                      : "border-orange-100 bg-gray-50/80 hover:border-orange-200"
                  }`}
                >
                  <TextWithArrow
                  text={c.name}
                  className="font-inter text-sm font-medium text-gray-800 lg:text-base"
                  iconClassName="h-3.5 w-3.5 shrink-0 text-gray-500 sm:h-4 sm:w-4"
                />
                  <span
                    className={`rounded px-2 py-0.5 font-inter text-[10px] font-semibold uppercase tracking-wide lg:px-2.5 lg:py-1 lg:text-xs ${
                      c.active ? "bg-[#FF8C00] text-white" : "bg-gray-200 text-[#74777F]"
                    }`}
                  >
                    {c.active ? "Active" : "Inactive"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-2 shrink-0 rounded-md bg-[#74777F]/10 px-2 py-1.5 sm:mt-3 sm:rounded-lg sm:px-3 sm:py-2 lg:mt-4 lg:rounded-lg lg:px-4 lg:py-3">
          <p className="font-inter text-[10px] text-[#74777F] sm:text-xs lg:text-sm">
            Shared link shows: <span className="font-semibold text-gray-800">{active?.name ?? "—"}</span> — no new URL when you switch.
          </p>
        </div>
      </div>
    </div>
  );
}
