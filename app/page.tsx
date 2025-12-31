"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

export default function LandingPage() {
  const [authUrl, setAuthUrl] = useState("/auth");

  // Set dynamic auth URL based on origin
  useEffect(() => {
    if (typeof window !== "undefined") {
      setAuthUrl(`${window.location.origin}/auth`);
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Sunrise Dawn Background Pattern - Solid colors only */}
      <div className="fixed inset-0 z-0 bg-orange-50">
        {/* Subtle pattern overlay */}
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `repeating-linear-gradient(
              45deg,
              transparent,
              transparent 10px,
              rgba(251, 191, 36, 0.1) 10px,
              rgba(251, 191, 36, 0.1) 20px
            )`,
          }}
        />
      </div>

      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-4 pb-4">
        <div className="w-[60%] bg-white/80 backdrop-blur-sm border border-orange-100 rounded-2xl shadow-md">
          <div className="flex items-center justify-between h-14 md:h-16 px-4 sm:px-6">
            {/* Logo */}
            <div className="relative h-8 md:h-10 w-32 md:w-40">
              <Image
                src="/pitchlikethis-logo.svg"
                alt="Pitch Like This"
                fill
                className="object-contain object-left"
                priority
              />
            </div>

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

      {/* Hero Section */}
      <main className="flex-1 flex items-center justify-center pt-20 md:pt-24 pb-20 relative z-10">
        <div className="max-w-7xl ml-auto mr-0 px-4 sm:px-6 lg:pl-8 lg:pr-0 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-15 items-center">
            {/* Left Container - Desktop & Mobile */}
            <div className="text-center lg:text-left space-y-6 md:space-y-8">
              <h2 className="font-poppins font-semibold text-lg sm:text-3xl md:text-4xl lg:text-5xl text-gray-800 leading-tight">
                <div>You excel at your skills.</div>
                <div>We excel at selling them.</div>
              </h2>
              
              <p className="font-inter font-semibold text-base sm:text-lg md:text-xl text-gray-700 leading-relaxed max-w-2xl mx-auto lg:mx-0 text-center">
                <span className="inline-flex flex-wrap justify-center lg:justify-start items-center gap-2 bg-white/90 backdrop-blur-sm border border-orange-100 rounded-xl px-4 py-3 pb-6 shadow-sm">
                  <span className="whitespace-nowrap">Analyze the requirements</span>
                  <svg className="w-10 h-10 shrink-0 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12c0 0 4-1 8-1s8 1 8 1" />
                    <path d="M15 8c2 1 4 3 5 4c-1 1-3 3-5 4" />
                  </svg>
                  <span className="whitespace-nowrap">Tailor your narrative </span>
                  <svg className="w-10 h-10 shrink-0 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12c0 0 4-1 8-1s8 1 8 1" />
                    <path d="M15 8c2 1 4 3 5 4c-1 1-3 3-5 4" />
                  </svg>
                  <span className="whitespace-nowrap">Attach evidence</span>
                  <svg className="w-10 h-10 shrink-0 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12c0 0 4-1 8-1s8 1 8 1" />
                    <path d="M15 8c2 1 4 3 5 4c-1 1-3 3-5 4" />
                  </svg>
                  <span className="whitespace-nowrap">Track responses</span>

                  <svg className="w-10 h-10 shrink-0 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12c0 0 4-1 8-1s8 1 8 1" />
                    <path d="M15 8c2 1 4 3 5 4c-1 1-3 3-5 4" />
                  </svg>
                
                  and stand out from the noise with
                  <span className="relative inline-block">
                    <span className="relative z-10">specific, personalised pitches</span>
                    <svg
                      className="absolute -bottom-1 left-0 right-0 h-3 z-0"
                      viewBox="0 0 200 12"
                      preserveAspectRatio="none"
                    >
                      <path
                        d="M 0 8 Q 50 4, 100 6 T 200 8"
                        stroke="#f97316"
                        strokeWidth="3"
                        fill="none"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                </span>
              </p>

              <div className="flex flex-col lg:flex-row justify-center lg:justify-start items-center lg:items-center gap-3 lg:gap-4 pt-2">
                <Link
                  href={authUrl}
                  onClick={() => {
                    if (typeof window !== "undefined" && (window as any).gtag) {
                      (window as any).gtag("event", "click", {
                        event_category: "CTA",
                        event_label: "Create Your Pitch",
                      });
                    }
                  }}
                  className="font-inter font-semibold text-base md:text-lg px-8 md:px-10 py-3 md:py-4 rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 w-full lg:w-auto text-center"
                >
                  Create Your Pitch
                </Link>
                <a
                  href="https://www.pitchlikethis.com/project/1afa893f-68ed-41e2-87e7-907f9278b68d"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    if (typeof window !== "undefined" && (window as any).gtag) {
                      (window as any).gtag("event", "click", {
                        event_category: "CTA",
                        event_label: "Sample Pitch",
                      });
                    }
                  }}
                  className="font-inter font-semibold text-base md:text-lg px-8 md:px-10 py-3 md:py-4 rounded-lg border-2 border-orange-500 text-orange-500 bg-white hover:bg-orange-50 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 w-full lg:w-auto text-center"
                >
                  Sample Pitch
                </a>
              </div>
            </div>

            {/* Right Container - Product Image (Desktop only) */}
            <div className="hidden lg:block relative h-[500px] lg:h-[600px]">
              <div className="absolute inset-y-0 left-0 right-0 overflow-hidden">
                <div className="relative w-full h-full rounded-l-3xl overflow-hidden shadow-2xl" style={{ marginRight: '-2rem' }}>
                  <img
                    src="/pitchlikethis-landing-desktop.png"
                    alt="Pitch Like This Product"
                    className="w-full h-full object-cover object-left"
                  />
                </div>
              </div>
            </div>

            {/* Product Image - Mobile & Tablet (below text) */}
            <div className="lg:hidden relative w-full h-[300px] sm:h-[400px] md:h-[450px] overflow-visible -mb-20">
              <div className="relative w-full max-w-[455px] mx-auto h-[120%] rounded-t-3xl overflow-hidden shadow-2xl">
                <Image
                  src="/casestudystack-mobile.svg"
                  alt="Pitch Like This Product"
                  fill
                  className="object-cover object-top rounded-t-3xl"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 bg-white/80 backdrop-blur-sm border-t border-orange-100 py-4 md:py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600 leading-tight sm:leading-normal">
            <p className="font-inter">
              © 2025 - 2026 Pitch Like This. All rights reserved.
            </p>
            <p className="font-inter">
              Created by{" "}
              <a
                href="https://x.com/pranavdotexe"
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-600 hover:text-orange-700 font-semibold underline"
              >
                Pranav
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
