"use client";

import { useState } from "react";
import { landingTheme } from "./landing-tokens";

type Point = {
  title: string;
  text: string;
};

const USER_TYPES: { id: "jobs" | "clients" | "misc"; label: string; points: Point[] }[] = [
  {
    id: "jobs",
    label: "I am a Job Seeker",
    points: [
      {
        title: "Level up past cold email",
        text: "Everyone is sending cold emails, we help you level up with more interactive pitches.",
      },
      {
        title: "Personalized, not generic",
        text: "Resumes are too generic - we give you tools to make a personalized pitch.",
      },
      {
        title: "Tools that convert",
        text: "Job Boards do not help you convert, our goal is to give you tools that convert opportunities.",
      },
    ],
  },
  {
    id: "clients",
    label: "I am a Freelancer",
    points: [
      {
        title: "Built for technical freelancers",
        text: "These are Freelancers who develop technical products for their clients. Make personalized pitches to your clients, showcase contextual projects they will relate to.",
      },
      {
        title: "From prospects to warm leads",
        text: "Convert prospects to warm leads and reach out to them once they have interacted to your campaigns.",
      },
      {
        title: "Decide with real engagement",
        text: "Analyse Active Sessions, Engaged Sessions, and Time Spent - use insights to make decisions.",
      },
    ],
  },
  {
    id: "misc",
    label: "I am a Founder",
    points: [
      {
        title: "Investors, founders, hiring managers",
        text: "These can be people pitching ideas to investors via this tool or hiring managers pitches job roles to potential candidates.",
      },
      {
        title: "Focus on the pitch, not the plumbing",
        text: "Spend more time framing your pitch and showcasing correct details over figuring out ways to pitch.",
      },
      {
        title: "Ship updates without new links",
        text: "Perfect your pitches on the go - modify anytime without have to reshare a new link.",
      },
      {
        title: "Your leads stay yours",
        text: "A fully secure system where only you can access your leads - archive campaigns to remove them from public view.",
      },
    ],
  },
];

export function IsThisForMeSection() {
  const [active, setActive] = useState<(typeof USER_TYPES)[number]["id"]>("jobs");

  const selected = USER_TYPES.find((u) => u.id === active) ?? USER_TYPES[0];

  return (
    <section className="relative z-10 py-14 md:py-20 px-4 sm:px-6 lg:px-8 border-t border-[#E8E4DC]/80">
      <div className="max-w-7xl mx-auto">
        <h2
          className="font-poppins font-semibold text-2xl sm:text-3xl md:text-4xl text-center"
          style={{ color: landingTheme.ink }}
        >
          Is This for Me
        </h2>
        <p className="font-inter text-center mt-3 max-w-2xl mx-auto text-sm sm:text-base" style={{ color: landingTheme.muted }}>
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
                    ? "shadow-md bg-white"
                    : "bg-white/80 hover:border-[#D8D5DE]"
                }`}
                style={
                  active === u.id
                    ? { borderColor: landingTheme.brown, color: landingTheme.ink }
                    : { borderColor: "#E8E4DC", color: landingTheme.muted }
                }
              >
                {u.label}
              </button>
            ))}
          </nav>

          <article
            className="flex-1 rounded-2xl border bg-white shadow-md p-6 sm:p-8 min-h-[200px]"
            style={{ borderColor: "#E8E4DC" }}
            aria-live="polite"
          >
            <h3 className="font-poppins font-semibold text-lg sm:text-xl" style={{ color: landingTheme.brown }}>
              {selected.label}
            </h3>

            <ul className="mt-6 grid list-none gap-3 sm:gap-4" role="list">
              {selected.points.map((point, i) => (
                <li
                  key={`${selected.id}-${i}`}
                  className="flex gap-3 rounded-xl border border-[#E8E4DC] bg-gradient-to-br from-[#FFFBF2]/80 to-white p-4 shadow-sm sm:gap-4 sm:p-5"
                >
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold sm:h-9 sm:w-9 sm:text-sm"
                    style={{
                      backgroundColor: "rgba(255, 140, 0, 0.12)",
                      color: landingTheme.brown,
                    }}
                    aria-hidden
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-poppins text-sm font-semibold leading-snug text-[#2C2419] sm:text-base">
                      {point.title}
                    </p>
                    <p className="font-inter mt-1.5 text-sm leading-relaxed sm:text-[0.9375rem]" style={{ color: landingTheme.muted }}>
                      {point.text}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </div>
    </section>
  );
}
