"use client";

import { useState } from "react";

const USER_TYPES = [
  {
    id: "jobs",
    label: "Those looking for Jobs",
    body:
      "Everyone is sending cold emails, we help you level up with more interactive pitches. Resumes are too generic - we give you tools to make a personalized pitch. Job Boards do not help you convert, our goal is to give you tools that convert opportunities.",
  },
  {
    id: "clients",
    label: "Those looking for Clients",
    body:
      "These are Freelancers who develop technical products for their clients. Make personalized pitches to your clients, showcase contextual projects they will relate to. Convert prospects to warm leads and reach out to them once they have interacted to your campaigns. Analyse Active Sessions, Engaged Sessions, and Time Spent - use insights to make decisions.",
  },
  {
    id: "misc",
    label: "Miscellaneous or Founder",
    body:
      "These can be people pitching ideas to investors via this tool or hiring managers pitches job roles to potential candidates. Spend more time framing your pitch and showcasing correct details over figuring out ways to pitch. Perfect your pitches on the go - modify anytime without have to reshare a new link. A fully secure system where only you can access your leads - archive campaigns to remove them from public view.",
  },
] as const;

export function IsThisForMeSection() {
  const [active, setActive] = useState<(typeof USER_TYPES)[number]["id"]>("jobs");

  const selected = USER_TYPES.find((u) => u.id === active) ?? USER_TYPES[0];

  return (
    <section className="relative z-10 py-14 md:py-20 px-4 sm:px-6 lg:px-8 border-t border-orange-100/80">
      <div className="max-w-7xl mx-auto">
        <h2 className="font-poppins font-semibold text-2xl sm:text-3xl md:text-4xl text-gray-900 text-center">
          Is This for Me
        </h2>
        <p className="font-inter text-center text-[#74777F] mt-3 max-w-2xl mx-auto text-sm sm:text-base">
          Choose a profile to see how Pitch Like This fits your situation.
        </p>

        <div className="mt-10 flex flex-col lg:flex-row gap-6 lg:gap-10">
          <nav className="flex flex-col gap-2 lg:w-72 shrink-0" aria-label="User types">
            {USER_TYPES.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => setActive(u.id)}
                className={`text-left rounded-xl border px-4 py-3 font-poppins text-sm sm:text-base font-medium transition-colors ${
                  active === u.id
                    ? "border-[#FF8C00] bg-orange-50 text-gray-900 shadow-sm"
                    : "border-orange-100 bg-white text-[#74777F] hover:border-orange-200"
                }`}
              >
                {u.label}
              </button>
            ))}
          </nav>

          <article
            className="flex-1 rounded-2xl border border-orange-100 bg-white/90 shadow-md p-6 sm:p-8 min-h-[200px]"
            aria-live="polite"
          >
            <h3 className="font-poppins font-semibold text-lg text-[#E07B39]">{selected.label}</h3>
            <p className="font-inter text-[#74777F] mt-4 leading-relaxed">{selected.body}</p>
          </article>
        </div>
      </div>
    </section>
  );
}
