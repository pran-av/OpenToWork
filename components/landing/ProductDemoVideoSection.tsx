"use client";

import { useEffect, useState } from "react";
import { Play } from "lucide-react";
import { SAMPLE_PITCH_URL, landingTheme } from "./landing-tokens";

/** High-res poster (served from /public); not fetched until client defers load. */
const POSTER_SRC = "/landing/sample-pitch-demo-thumbnail.png";

const EMBED_BASE =
  "https://www.youtube.com/embed/ti6aYxrPfTE?si=JtwnlM-m_b-CViLu&start=1";

/** Muted autoplay is required in most browsers for programmatic start on iframe mount. */
function embedSrcAutoplay() {
  return `${EMBED_BASE}&autoplay=1&mute=1`;
}

export function ProductDemoVideoSection() {
  const [showPlayer, setShowPlayer] = useState(false);
  const [posterReady, setPosterReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const run = () => setPosterReady(true);
    let idleId: number | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    if ("requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(run, { timeout: 2500 });
    } else {
      timeoutId = window.setTimeout(run, 300);
    }
    return () => {
      if (idleId !== undefined && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    };
  }, []);

  return (
    <section
      aria-label="Product demo video"
      className="relative z-10 w-full px-4 pb-10 pt-2 sm:px-6 sm:pb-12 sm:pt-0 md:pb-14 lg:px-8"
    >
      <div className="mx-auto flex w-full max-w-4xl flex-col items-stretch xl:max-w-5xl">
        {showPlayer ? (
          <div className="aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-lg ring-1 ring-black/10">
            <iframe
              title="YouTube video player"
              src={embedSrcAutoplay()}
              className="h-full w-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowPlayer(true)}
            className="group relative aspect-video w-full cursor-pointer overflow-hidden rounded-2xl bg-black/90 text-left shadow-lg ring-1 ring-black/10 outline-none transition hover:ring-black/20 focus-visible:ring-2 focus-visible:ring-[#FF8C00] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFFBF2]"
            aria-label="Play product demo on YouTube"
          >
            {posterReady ? (
              <img
                src={POSTER_SRC}
                alt=""
                width={1920}
                height={1080}
                className="absolute inset-0 h-full w-full object-cover opacity-90 transition group-hover:opacity-100"
                loading="lazy"
                decoding="async"
                fetchPriority="low"
              />
            ) : null}
            <span
              className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent"
              aria-hidden
            />
            <span className="absolute inset-0 flex items-center justify-center" aria-hidden>
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/95 text-[#5D4A3A] shadow-md ring-2 ring-white/80 transition group-hover:scale-105 group-hover:bg-white sm:h-20 sm:w-20">
                <Play className="ml-0.5 h-8 w-8 sm:h-10 sm:w-10" strokeWidth={1.75} aria-hidden />
              </span>
            </span>
          </button>
        )}

        <div className="mt-4 flex justify-center sm:mt-5">
          <a
            href={SAMPLE_PITCH_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-inter inline-flex items-center justify-center rounded-2xl border-2 px-6 py-3 text-center text-sm font-semibold shadow-md transition hover:bg-[#EEF0F4]/80 sm:px-8 sm:text-base"
            style={{
              borderColor: landingTheme.greyBorder,
              color: landingTheme.ink,
              backgroundColor: "#FFFFFF",
            }}
          >
            Try the Sample Pitch
          </a>
        </div>
      </div>
    </section>
  );
}
