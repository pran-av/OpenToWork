"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Music, Music2 } from "lucide-react";
import Link from "next/link";
import { useElevatorMusic } from "./useElevatorMusic";

export default function PreludePage() {
  const { isMusicOn, toggleMusic } = useElevatorMusic();

  // Preload card images for /pitch page
  useEffect(() => {
    const imageUrls = [
      "/case_study_cta_modified_3d.png",
      "/publish_cta_3d.png",
      "/copy_share_url_3d.png",
    ];
    imageUrls.forEach((url) => {
      const link = document.createElement("link");
      link.rel = "prefetch";
      link.as = "image";
      link.href = url;
      document.head.appendChild(link);
    });
  }, []);

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {/* Fixed Background Image with Overlay */}
      <div className="fixed inset-0 z-0">
        <picture className="absolute inset-0">
          <source srcSet="/elevator-background-avif.avif" type="image/avif" />
          <source srcSet="/elevator-background-webp.webp" type="image/webp" />
          <Image
            src="/elevator-background-browser-jpeg.jpg"
            alt="Elevator background"
            fill
            priority
            className="object-cover object-center"
            quality={75}
            sizes="100vw"
          />
        </picture>
        <div
          className="absolute inset-0"
          style={{ backgroundColor: "#FFE4B9", opacity: 0.64 }}
        />
      </div>

      {/* Prelude Screen - P2 */}
      <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-auto">
        {/* Subtle darkening */}
        <div className="absolute inset-0 bg-black/5" />

        {/* Music toggle - top right */}
        <button
          onClick={toggleMusic}
          className="absolute top-6 right-6 z-50 w-6 h-6 flex items-center justify-center"
          aria-label={isMusicOn ? "Turn off music" : "Turn on music"}
        >
          {isMusicOn ? (
            <Music className="w-6 h-6 text-black" />
          ) : (
            <Music2 className="w-6 h-6 text-black" />
          )}
        </button>

        {/* Yellow prelude surface */}
        <div className="relative z-40 mx-4 sm:mx-6">
          <div className="mx-auto max-w-sm sm:max-w-md md:max-w-lg rounded-[18px] border border-black bg-[#FFFED3] px-5 py-6 sm:px-6 sm:py-8 md:px-8 md:py-10 shadow-md">
            <div className="space-y-5 text-left">
              <p
                className="prelude-line font-inter text-[20px] md:text-[24px] leading-relaxed text-black"
                style={{ animationDelay: "0s" }}
              >
                Imagine being in an elevator with someone who might hire you or be your future client.
              </p>
              <p
                className="prelude-line font-inter text-[20px] md:text-[24px] leading-relaxed text-black"
                style={{ animationDelay: "1.8s" }}
              >
                What would you do to{" "}
                <span className="font-semibold">convince them</span> before the elevator reaches its
                destination?
              </p>
              <p
                className="prelude-line font-inter text-[20px] md:text-[24px] leading-relaxed text-black"
                style={{ animationDelay: "3.6s" }}
              >
                You would craft a story, add convincing pointers, be quick and be unique to keep their
                attention.
              </p>

              {/* Tag row (white button-like chips) */}
              <div
                className="prelude-tag mt-6 flex flex-wrap justify-center gap-3"
                style={{ animationDelay: "7.2s" }}
              >
                <span className="px-4 py-2 rounded-[10px] border border-black bg-white font-inter font-bold text-[16px] md:text-[20px]">
                  storytelling
                </span>
                <span className="px-4 py-2 rounded-[10px] border border-black bg-white font-inter font-bold text-[16px] md:text-[20px]">
                  convincing
                </span>
                <span className="px-4 py-2 rounded-[10px] border border-black bg-white font-inter font-bold text-[16px] md:text-[20px]">
                  being unique
                </span>
                <span className="px-4 py-2 rounded-[10px] border border-black bg-white font-inter font-bold text-[16px] md:text-[20px]">
                  time discipline
                </span>
              </div>

              <p
                className="prelude-line font-inter text-[20px] md:text-[24px] leading-relaxed text-black pt-2"
                style={{ animationDelay: "5.4s" }}
              >
                <span className="font-semibold text-[#5B139A]">Elevator Pitch</span> is an app that helps
                you make that pitch!
              </p>

              <div className="mt-8 flex justify-center">
                <Link
                  href="/pitch"
                  className="inline-flex items-center justify-center rounded-[10px] border border-black bg-white px-6 py-3 font-inter font-semibold text-[16px] md:text-[18px] text-black hover:bg-gray-100 transition-colors"
                >
                  Explore Elevator Pitch
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
