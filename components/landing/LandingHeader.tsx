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
        <div className="flex items-center justify-between h-14 md:h-16">
          <div className="relative h-8 md:h-10 w-32 md:w-40">
            <Image
              src="/pitchlikethis-logo.svg"
              alt="Pitch Like This"
              fill
              className="object-contain object-left"
              priority
            />
          </div>

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
