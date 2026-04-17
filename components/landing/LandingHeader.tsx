"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { landingTheme } from "./landing-tokens";

export function LandingHeader() {
  const pathname = usePathname();
  const [authUrl, setAuthUrl] = useState("/auth");
  const [pastHero, setPastHero] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setAuthUrl(`${window.location.origin}/auth`);
    }
  }, []);

  useEffect(() => {
    if (pathname !== "/") return;

    const update = () => {
      const hero = document.getElementById("hero");
      if (!hero) {
        setPastHero(false);
        return;
      }
      setPastHero(hero.getBoundingClientRect().bottom < 1);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [pathname]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-4 pb-4 px-4 sm:px-6">
      <div
        className="w-full max-w-7xl rounded-2xl shadow-md border backdrop-blur-sm px-4 sm:px-6"
        style={{
          backgroundColor: "rgba(255, 251, 242, 0.92)",
          borderColor: "#E8E4DC",
        }}
      >
        <div className="flex h-14 w-full items-center justify-between gap-3 md:h-16 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:items-center lg:gap-4">
          <Link
            href="/#hero"
            className="flex min-w-0 min-h-[44px] items-center gap-2 md:gap-3 lg:justify-self-start"
            onClick={(e) => {
              if (pathname !== "/") return;
              e.preventDefault();
              document.getElementById("hero")?.scrollIntoView({ behavior: "smooth", block: "start" });
              window.history.replaceState(null, "", "/");
            }}
          >
            <Image
              src="/pitchlikethis-logo.svg"
              alt=""
              width={24}
              height={26}
              className="pointer-events-none h-8 w-auto shrink-0 object-contain object-left md:h-10"
              priority
            />
            <span
              className="pointer-events-none min-w-0 font-poppins text-base font-semibold leading-tight tracking-tight md:text-lg truncate"
              style={{ color: landingTheme.ink }}
            >
              Pitch Like This
            </span>
          </Link>

          <nav
            className="hidden items-center justify-center gap-8 lg:flex lg:justify-self-center"
            aria-label="Page sections"
          >
            <a
              href="#features"
              className="font-inter text-sm font-semibold text-[#6B6560] transition-colors hover:text-[#2C2419] hover:underline underline-offset-4"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="font-inter text-sm font-semibold text-[#6B6560] transition-colors hover:text-[#2C2419] hover:underline underline-offset-4"
            >
              How It Works
            </a>
          </nav>

          <Link
            href={authUrl}
            onClick={() => {
              if (!pastHero) return;
              if (typeof window !== "undefined" && (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag) {
                (window as unknown as { gtag: (...a: unknown[]) => void }).gtag("event", "click", {
                  event_category: "CTA",
                  event_label: "Create Pitch",
                });
              }
            }}
            className={`font-inter font-semibold rounded-2xl border-2 transition-all lg:justify-self-end ${
              pastHero
                ? "min-w-0 max-w-[calc(100vw-11rem)] truncate border-transparent px-3 py-2 text-[11px] text-white shadow-lg hover:opacity-95 hover:shadow-xl sm:max-w-none sm:overflow-visible sm:whitespace-normal sm:px-4 sm:py-2.5 sm:text-xs md:px-6 md:py-2.5 md:text-sm"
                : "bg-white px-4 py-2 text-xs shadow-sm hover:shadow-md md:px-6 md:py-2.5 md:text-sm"
            }`}
            style={
              pastHero
                ? { backgroundColor: landingTheme.brown, borderColor: "transparent" }
                : { borderColor: landingTheme.greyBorder, color: landingTheme.ink }
            }
          >
            {pastHero ? "Build My First Pitch" : "Login"}
          </Link>
        </div>
      </div>
    </header>
  );
}
