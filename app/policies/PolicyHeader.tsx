"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

export default function PolicyHeader() {
  const [authUrl, setAuthUrl] = useState("/auth");

  // Set dynamic auth URL based on origin
  useEffect(() => {
    if (typeof window !== "undefined") {
      setAuthUrl(`${window.location.origin}/auth`);
    }
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-4 pb-4">
      <div className="w-[60%] bg-white/80 backdrop-blur-sm border border-orange-100 rounded-2xl shadow-md">
        <div className="flex items-center justify-between h-14 md:h-16 px-4 sm:px-6">
          {/* Logo */}
          <Link href="/" className="relative h-8 md:h-10 w-32 md:w-40">
            <Image
              src="/pitchlikethis-logo.svg"
              alt="Pitch Like This"
              fill
              className="object-contain object-left"
              priority
            />
          </Link>

          {/* CTA Button */}
          <Link
            href={authUrl}
            className="font-inter font-semibold text-xs md:text-sm px-3 md:px-5 py-1.5 md:py-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-all shadow-md hover:shadow-lg"
          >
            <span className="hidden md:inline">Create Your Pitch</span>
            <span className="md:hidden">Login</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

