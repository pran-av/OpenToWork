"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { SageWindow, type SageWindowHandle } from "@/components/dashboard/SageWindow";

type DashboardSageFrameProps = {
  children: ReactNode;
  /** Offset from the top of the viewport so the Sage column starts below the Studio header. */
  headerOffsetPx: number;
};

/**
 * Mounts the fixed Sage window on the Studio shell (all /dashboard/* routes) so the
 * conversation and API state survive client navigations. When the “layer” is active, the
 * rest of the app (below the header) is dimmed and blurred; the header stays clear (z-50).
 */
export function DashboardSageFrame({ children, headerOffsetPx }: DashboardSageFrameProps) {
  const [sageLayerActive, setSageLayerActive] = useState(false);
  const sageRef = useRef<SageWindowHandle>(null);

  const onSageLayerChange = useCallback((open: boolean) => {
    setSageLayerActive(open);
  }, []);

  useEffect(() => {
    if (!sageLayerActive) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [sageLayerActive]);

  return (
    <div className="relative flex min-h-0 w-full min-w-0 flex-1 flex-col">
      {children}

      {/* Desktop Sage chrome: fixed to viewport, persists across page transitions */}
      <div className="max-lg:hidden">
        {sageLayerActive ? (
          <div
            className="pointer-events-auto fixed inset-0 z-[32] bg-zinc-900/20 backdrop-blur-md dark:bg-black/35"
            role="presentation"
            aria-hidden
          />
        ) : null}

        {sageLayerActive ? (
          <div
            className="pointer-events-auto fixed bottom-8 right-[calc(50vw+1.75rem)] z-[36] flex max-w-[19rem] flex-col items-center gap-3"
            role="complementary"
            aria-label="Sage"
          >
            <div className="rounded-2xl border border-orange-200/90 bg-orange-50 px-3 py-2 text-center text-xs font-medium text-orange-900 shadow-sm dark:border-zinc-600 dark:bg-zinc-800/95 dark:text-zinc-100">
              Hi, I&apos;m Sage!
            </div>
            <Image
              src="/sage_mascot.png"
              alt="Sage, your guide"
              width={120}
              height={150}
              className="h-32 w-auto object-contain drop-shadow-lg select-none"
              priority
            />
          </div>
        ) : null}

        <div
          className="fixed right-0 bottom-0 z-[40] w-[50vw] min-w-0 pl-0"
          style={{ top: headerOffsetPx }}
        >
          <SageWindow ref={sageRef} onSageLayerChange={onSageLayerChange} className="h-full" />
        </div>
      </div>
    </div>
  );
}
