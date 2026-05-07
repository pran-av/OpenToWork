"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DashboardFooter from "@/components/dashboard/DashboardFooter";
import { DashboardMainCanvas } from "@/components/dashboard/DashboardMainCanvas";
import { DashboardSageFrame } from "@/components/dashboard/DashboardSageFrame";
import DashboardDesktopSidebar from "@/components/dashboard/DashboardDesktopSidebar";
import DashboardFlowPullDrawer from "@/components/dashboard/DashboardFlowPullDrawer";

type DashboardClientShellProps = {
  children: ReactNode;
};

export function DashboardClientShell({ children }: DashboardClientShellProps) {
  const headerShellRef = useRef<HTMLDivElement>(null);
  const [headerHeightPx, setHeaderHeightPx] = useState(72);
  const [desktopFlowOverlayActive, setDesktopFlowOverlayActive] = useState(false);

  useLayoutEffect(() => {
    const el = headerShellRef.current;
    if (!el) return;
    const update = () => {
      setHeaderHeightPx(el.getBoundingClientRect().height);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-orange-50 dark:bg-zinc-950">
      {!desktopFlowOverlayActive ? (
        <div ref={headerShellRef} className="relative z-50">
          <DashboardHeader />
          <DashboardFlowPullDrawer />
        </div>
      ) : null}
      <div className="flex min-h-0 flex-1">
        {!desktopFlowOverlayActive ? <DashboardDesktopSidebar /> : null}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <DashboardSageFrame
            headerOffsetPx={desktopFlowOverlayActive ? 0 : headerHeightPx}
              onFlowOverlayChange={setDesktopFlowOverlayActive}
          >
            <DashboardMainCanvas>{children}</DashboardMainCanvas>
            <DashboardFooter />
          </DashboardSageFrame>
        </div>
      </div>
    </div>
  );
}
