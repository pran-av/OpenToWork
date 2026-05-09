/**
 * Lets dashboard clients temporarily hide the studio mobile bottom nav (e.g. when a bottom sheet would clash).
 * Desktop nav is unaffected.
 */
export const STUDIO_SUPPRESS_MOBILE_BOTTOM_NAV_EVENT = "opentowork-studio-suppress-mobile-bottom-nav" as const;

export type StudioSuppressMobileBottomNavDetail = { suppressed: boolean };

export function setStudioMobileBottomNavSuppressed(suppressed: boolean): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<StudioSuppressMobileBottomNavDetail>(STUDIO_SUPPRESS_MOBILE_BOTTOM_NAV_EVENT, {
      detail: { suppressed },
    })
  );
}
