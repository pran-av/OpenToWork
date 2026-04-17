"use client";

import { useCallback, useRef, useState, type CSSProperties, type ReactNode } from "react";

type Point = { x: number; y: number };

const GRID = "20px 20px";
const GLOW_RADIUS = 220;

const baseLayerLight: CSSProperties = {
  backgroundColor: "transparent",
  backgroundImage:
    "radial-gradient(circle at 1px 1px, rgba(93, 74, 58, 0.22) 1.25px, transparent 1.25px)",
  backgroundSize: GRID,
  backgroundPosition: "0 0",
};

const glowLayerLight: CSSProperties = {
  backgroundColor: "transparent",
  backgroundImage:
    "radial-gradient(circle at 1px 1px, rgba(120, 53, 9, 0.45) 1.35px, transparent 1.35px)",
  backgroundSize: GRID,
  backgroundPosition: "0 0",
};

const baseLayerDark: CSSProperties = {
  backgroundColor: "transparent",
  backgroundImage:
    "radial-gradient(circle at 1px 1px, rgba(228, 228, 231, 0.18) 1.25px, transparent 1.25px)",
  backgroundSize: GRID,
  backgroundPosition: "0 0",
};

const glowLayerDark: CSSProperties = {
  backgroundColor: "transparent",
  backgroundImage:
    "radial-gradient(circle at 1px 1px, rgba(250, 250, 250, 0.42) 1.35px, transparent 1.35px)",
  backgroundSize: GRID,
  backgroundPosition: "0 0",
};

export function DashboardMainCanvas({ children }: { children: ReactNode }) {
  const mainRef = useRef<HTMLElement>(null);
  const [pointer, setPointer] = useState<Point | null>(null);
  const [glowActive, setGlowActive] = useState(false);

  const updatePointer = useCallback((clientX: number, clientY: number) => {
    const el = mainRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPointer({ x: clientX - r.left, y: clientY - r.top });
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      updatePointer(e.clientX, e.clientY);
    },
    [updatePointer]
  );

  const handlePointerEnter = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      setGlowActive(true);
      updatePointer(e.clientX, e.clientY);
    },
    [updatePointer]
  );

  const handlePointerLeave = useCallback(() => {
    setGlowActive(false);
  }, []);

  const mask =
    pointer != null
      ? `radial-gradient(${GLOW_RADIUS}px circle at ${pointer.x}px ${pointer.y}px, black 0%, transparent 72%)`
      : "none";

  const glowOpacity = glowActive && pointer != null ? 1 : 0;

  const glowMaskStyle: CSSProperties = {
    WebkitMaskImage: mask,
    maskImage: mask,
    opacity: glowOpacity,
    transition: "opacity 0.15s ease-out",
  };

  return (
    <main
      ref={mainRef}
      className="relative flex min-h-0 w-full min-w-0 flex-1 flex-col bg-orange-50 dark:bg-zinc-950"
      onPointerEnter={handlePointerEnter}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <div className="pointer-events-none absolute inset-0 z-0 bg-orange-50 dark:bg-zinc-950" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0 z-[1] dark:hidden"
        style={baseLayerLight}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 z-[1] hidden dark:block"
        style={baseLayerDark}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 z-[2] dark:hidden"
        style={{ ...glowLayerLight, ...glowMaskStyle }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 z-[2] hidden dark:block"
        style={{ ...glowLayerDark, ...glowMaskStyle }}
        aria-hidden
      />
      <div className="relative z-10 container mx-auto w-full px-4 py-8">{children}</div>
    </main>
  );
}
