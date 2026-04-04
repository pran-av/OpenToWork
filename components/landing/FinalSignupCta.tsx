"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

export function FinalSignupCta() {
  const [authUrl, setAuthUrl] = useState("/auth");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setAuthUrl(`${window.location.origin}/auth`);
    }
  }, []);

  return (
    <section className="relative z-10 py-16 md:py-24 px-4 sm:px-6 lg:px-8 border-t border-orange-100/80">
      <div className="max-w-3xl mx-auto text-center rounded-3xl border-2 border-[#FFB800]/40 bg-gradient-to-br from-white to-orange-50/50 shadow-lg px-6 py-12 sm:px-10 sm:py-14">
        <h2 className="font-poppins font-semibold text-2xl sm:text-3xl text-gray-900">
          Ready to pitch with clarity?
        </h2>
        <p className="font-inter text-[#74777F] mt-3 text-sm sm:text-base">
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
          className="inline-flex font-inter font-semibold text-base md:text-lg px-10 py-4 mt-8 rounded-xl bg-[#FF8C00] text-white hover:bg-[#E07B39] transition-all shadow-lg hover:shadow-xl"
        >
          Signup and Start Pitching
        </Link>
      </div>
    </section>
  );
}
