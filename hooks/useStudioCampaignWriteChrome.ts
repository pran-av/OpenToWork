"use client";

import { useEffect, useState } from "react";

export const STUDIO_CAMPAIGN_WRITE_MODE_EVENT = "studio:campaign-write-mode";

export function emitStudioCampaignWriteMode(active: boolean) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(STUDIO_CAMPAIGN_WRITE_MODE_EVENT, { detail: { active } })
  );
}

/** True while a project campaign page is in draft edit (write) chrome — hide bottom nav, tighter main padding. */
export function useStudioCampaignWriteModeListener() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ active?: boolean }>;
      setActive(!!ce.detail?.active);
    };
    window.addEventListener(STUDIO_CAMPAIGN_WRITE_MODE_EVENT, handler as EventListener);
    return () => window.removeEventListener(STUDIO_CAMPAIGN_WRITE_MODE_EVENT, handler as EventListener);
  }, []);

  return active;
}
