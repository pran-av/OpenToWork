"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { landingTheme } from "./landing-tokens";

export function FinalSignupCta() {
  const [authUrl, setAuthUrl] = useState("/auth");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setAuthUrl(`${window.location.origin}/auth`);
    }
  }, []);

  return (
    <section className="relative z-10 py-16 md:py-24 px-4 sm:px-6 lg:px-8 border-t border-[#E8E4DC]/80">
      <div
        className="max-w-3xl mx-auto text-center rounded-3xl border px-6 py-12 sm:px-10 sm:py-14 shadow-lg"
        style={{
          backgroundColor: "#FFFFFF",
          borderColor: "#E8E4DC",
          boxShadow: "0 24px 48px -28px rgba(45, 36, 25, 0.2)",
        }}
      >
        <h2 className="font-poppins font-semibold text-2xl sm:text-3xl" style={{ color: landingTheme.ink }}>
          Ready to pitch with clarity?
        </h2>
        <p className="font-inter mt-3 text-sm sm:text-base" style={{ color: landingTheme.muted }}>
          Sign up free while we are in public beta and ship your first campaign in minutes.
        </p>
        <Link
          href={authUrl}
          onClick={() => {
            if (typeof window !== "undefined" && (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag) {
              (window as unknown as { gtag: (...a: unknown[]) => void }).gtag("event", "click", {
                event_category: "CTA",
                event_label: "Signup and Start Pitching",
              });
            }
          }}
          className="inline-flex font-inter font-semibold text-base md:text-lg px-10 py-4 mt-8 rounded-2xl text-white transition-all shadow-lg hover:shadow-xl hover:opacity-95"
          style={{ backgroundColor: landingTheme.brown }}
        >
          Build My First Pitch
        </Link>
      </div>
    </section>
  );
}
