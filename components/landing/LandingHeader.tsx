"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { landingTheme } from "./landing-tokens";

export function LandingHeader() {
  const [authUrl, setAuthUrl] = useState("/auth");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setAuthUrl(`${window.location.origin}/auth`);
    }
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-4 pb-4 px-4 sm:px-6">
      <div
        className="w-full max-w-7xl rounded-2xl shadow-md border backdrop-blur-sm px-4 sm:px-6"
        style={{
          backgroundColor: "rgba(255, 251, 242, 0.92)",
          borderColor: "#E8E4DC",
        }}
      >
        <div className="flex items-center justify-between h-14 md:h-16 gap-3">
          <Link
            href="/"
            className="flex min-w-0 items-center gap-2 md:gap-3"
          >
            <Image
              src="/pitchlikethis-logo.svg"
              alt=""
              width={24}
              height={26}
              className="h-8 w-auto shrink-0 object-contain object-left md:h-10"
              priority
            />
            <span
              className="font-poppins font-semibold text-base leading-tight tracking-tight md:text-lg truncate"
              style={{ color: landingTheme.ink }}
            >
              Pitch Like This
            </span>
          </Link>

          <Link
            href={authUrl}
            className="font-inter font-semibold text-xs md:text-sm px-4 md:px-6 py-2 md:py-2.5 rounded-2xl border-2 transition-all shadow-sm hover:shadow-md bg-white"
            style={{ borderColor: landingTheme.greyBorder, color: landingTheme.ink }}
          >
            Login
          </Link>
        </div>
      </div>
    </header>
  );
}
