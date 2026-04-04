"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

export function LandingHeader() {
  const [authUrl, setAuthUrl] = useState("/auth");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setAuthUrl(`${window.location.origin}/auth`);
    }
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-4 pb-4">
      <div className="w-[60%] bg-white/80 backdrop-blur-sm border border-orange-100 rounded-2xl shadow-md">
        <div className="flex items-center justify-between h-14 md:h-16 px-4 sm:px-6">
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
            className="font-inter font-semibold text-xs md:text-sm px-3 md:px-5 py-1.5 md:py-2 rounded-lg border-2 border-[#FF8C00] text-[#FF8C00] bg-white hover:bg-orange-50 transition-all shadow-md hover:shadow-lg"
          >
            Login
          </Link>
        </div>
      </div>
    </header>
  );
}
