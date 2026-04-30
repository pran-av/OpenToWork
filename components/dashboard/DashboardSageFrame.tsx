"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SageWindow, type SageWindowHandle } from "@/components/dashboard/SageWindow";

const SAGE_TASK_NAV_CONTEXT_KEY = "opentowork-sage-task-nav-v1";
const SAGE_TARGET_SELECTOR: Record<string, string> = {
  "profile.user_first_name.edit_cta": "#first_name",
  "profile.resume.upload_cta": "#resumes",
  "profile.linkedin.connect_cta": "#linkedin-connect",
  "nav.campaigns_dashboard": "#projects-root",
};

type DashboardSageFrameProps = {
  children: ReactNode;
  /** Offset from the top of the viewport so the Sage column starts below the Studio header. */
  headerOffsetPx: number;
};

type SageTaskNavContext = {
  target?: string;
  tooltip?: string;
  createdAt?: number;
  conversationId?: string | null;
  stepId?: string | null;
};

/**
 * Mounts the fixed Sage window on the Studio shell (all /dashboard/* routes) so the
 * conversation and API state survive client navigations. When the “layer” is active, the
 * rest of the app (below the header) is dimmed and blurred; the header stays clear (z-50).
 */
export function DashboardSageFrame({ children, headerOffsetPx }: DashboardSageFrameProps) {
  const [sageLayerActive, setSageLayerActive] = useState(false);
  const [sageRightRailOpen, setSageRightRailOpen] = useState(true);
  const [sageTaskDialog, setSageTaskDialog] = useState<{ open: boolean; message: string; target: string | null }>({
    open: false,
    message: "",
    target: null,
  });
  const [sageTaskContext, setSageTaskContext] = useState<SageTaskNavContext | null>(null);
  const [acknowledging, setAcknowledging] = useState(false);
  const [ackError, setAckError] = useState<string | null>(null);
  const [sageTaskDialogPos, setSageTaskDialogPos] = useState<{ top: number; left: number } | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sageRef = useRef<SageWindowHandle>(null);
  const sageTaskDialogRef = useRef<HTMLDivElement>(null);
  const highlightedTargetRef = useRef<Element | null>(null);
  const [activeHighlightTarget, setActiveHighlightTarget] = useState<string | null>(null);

  const clearSageHighlight = useCallback(() => {
    if (!highlightedTargetRef.current) return;
    highlightedTargetRef.current.classList.remove("sage-target-highlight");
    highlightedTargetRef.current = null;
  }, []);

  const tryApplyHighlight = useCallback(
    (target: string) => {
      const selector = SAGE_TARGET_SELECTOR[target];
      if (!selector) return false;
      const node = document.querySelector(selector);
      if (!node) return false;
      clearSageHighlight();
      node.classList.add("sage-target-highlight");
      highlightedTargetRef.current = node;
      if ("scrollIntoView" in node) {
        (node as HTMLElement).scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return true;
    },
    [clearSageHighlight]
  );

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

  useEffect(() => {
    const target = searchParams.get("sage_highlight");
    if (!target) return;

    window.setTimeout(() => {
      setActiveHighlightTarget(target);
    }, 0);

    try {
      const raw = sessionStorage.getItem(SAGE_TASK_NAV_CONTEXT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SageTaskNavContext;
        const tooltip = typeof parsed.tooltip === "string" ? parsed.tooltip.trim() : "";
        if (parsed.target === target && tooltip.length > 0) {
          window.setTimeout(() => {
            setSageTaskDialog({ open: true, message: tooltip, target });
            setSageTaskContext(parsed);
            setAckError(null);
          }, 0);
        }
      }
      sessionStorage.removeItem(SAGE_TASK_NAV_CONTEXT_KEY);
    } catch {
      // ignore storage parse issues
    }

    const params = new URLSearchParams(searchParams.toString());
    params.delete("sage_highlight");
    const next = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(next, { scroll: false });
  }, [pathname, router, searchParams]);

  useEffect(() => {
    if (!activeHighlightTarget || !sageTaskDialog.open) return;
    if (tryApplyHighlight(activeHighlightTarget)) return;

    // Route transitions can mount target content slightly later; retry briefly.
    const deadline = Date.now() + 9000;
    const intervalId = window.setInterval(() => {
      if (tryApplyHighlight(activeHighlightTarget) || Date.now() > deadline) {
        window.clearInterval(intervalId);
        observer.disconnect();
      }
    }, 200);

    const observer = new MutationObserver(() => {
      if (tryApplyHighlight(activeHighlightTarget)) {
        window.clearInterval(intervalId);
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.clearInterval(intervalId);
      observer.disconnect();
    };
  }, [activeHighlightTarget, sageTaskDialog.open, tryApplyHighlight]);

  useEffect(() => {
    if (!sageTaskDialog.open || !sageTaskDialog.target) return;
    const selector = SAGE_TARGET_SELECTOR[sageTaskDialog.target];
    if (!selector) return;

    const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));
    const overlaps = (
      a: { left: number; top: number; width: number; height: number },
      b: { left: number; top: number; width: number; height: number }
    ) =>
      !(
        a.left + a.width <= b.left ||
        b.left + b.width <= a.left ||
        a.top + a.height <= b.top ||
        b.top + b.height <= a.top
      );

    const updatePosition = () => {
      const node = document.querySelector(selector);
      if (!node) return;
      const rect = (node as HTMLElement).getBoundingClientRect();
      const cardNode = sageTaskDialogRef.current;
      const viewportW = window.innerWidth;
      const viewportH = window.innerHeight;
      const cardWidth = Math.min(cardNode?.offsetWidth ?? 360, viewportW - 24);
      const cardHeight = Math.min(cardNode?.offsetHeight ?? 190, viewportH - 24);
      const gap = 14;
      const padding = 12;

      const anchorRect = {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      };

      const candidates = [
        {
          left: rect.right + gap,
          top: rect.top + rect.height / 2 - cardHeight / 2,
        },
        {
          left: rect.left - cardWidth - gap,
          top: rect.top + rect.height / 2 - cardHeight / 2,
        },
        {
          left: rect.left + rect.width / 2 - cardWidth / 2,
          top: rect.bottom + gap,
        },
        {
          left: rect.left + rect.width / 2 - cardWidth / 2,
          top: rect.top - cardHeight - gap,
        },
      ].map((c) => ({
        left: clamp(c.left, padding, viewportW - cardWidth - padding),
        top: clamp(c.top, padding, viewportH - cardHeight - padding),
        width: cardWidth,
        height: cardHeight,
      }));

      const nonOverlapping = candidates.find((c) => !overlaps(c, anchorRect));
      if (nonOverlapping) {
        setSageTaskDialogPos({ top: nonOverlapping.top, left: nonOverlapping.left });
        return;
      }

      // Fallback: pick the position with smallest overlap area.
      const score = (c: { left: number; top: number; width: number; height: number }) => {
        const x = Math.max(0, Math.min(c.left + c.width, anchorRect.left + anchorRect.width) - Math.max(c.left, anchorRect.left));
        const y = Math.max(0, Math.min(c.top + c.height, anchorRect.top + anchorRect.height) - Math.max(c.top, anchorRect.top));
        return x * y;
      };
      const best = candidates.sort((a, b) => score(a) - score(b))[0];
      setSageTaskDialogPos({ top: best.top, left: best.left });
    };

    const raf = window.requestAnimationFrame(updatePosition);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [sageTaskDialog.open, sageTaskDialog.target]);

  return (
    <div className="relative flex min-h-0 w-full min-w-0 flex-1 flex-col">
      {children}
      <style jsx global>{`
        .sage-target-highlight {
          outline: 3px solid rgba(245, 158, 11, 0.9);
          outline-offset: 4px;
          box-shadow: 0 0 0 6px rgba(251, 191, 36, 0.28);
          transition: outline-color 0.2s ease, box-shadow 0.2s ease;
          animation: sage-highlight-pulse 1.2s ease-in-out 2;
        }
        @keyframes sage-highlight-pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.35);
          }
          100% {
            box-shadow: 0 0 0 8px rgba(251, 191, 36, 0);
          }
        }
      `}</style>

      {sageTaskDialog.open ? (
        <>
          <div className="fixed inset-0 z-[48] bg-black/18" aria-hidden />
          <div
            ref={sageTaskDialogRef}
            className="fixed z-[50] w-[min(22.5rem,calc(100vw-1.5rem))] rounded-xl border border-zinc-200 bg-white p-4 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
            role="dialog"
            aria-modal="true"
            style={{
              top: sageTaskDialogPos?.top ?? 24,
              left: sageTaskDialogPos?.left ?? 24,
            }}
          >
            <div className="flex items-start gap-3">
              <Image
                src="/sage_mascot.png"
                alt="Sage"
                width={44}
                height={56}
                className="mt-0.5 h-10 w-auto shrink-0 object-contain"
              />
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Sage tip</h2>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{sageTaskDialog.message}</p>
                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  {ackError ? (
                    <p className="w-full text-xs text-red-600 dark:text-red-400">{ackError}</p>
                  ) : null}
                  <button
                    type="button"
                    onClick={async () => {
                      if (acknowledging) return;
                      if (sageTaskContext?.conversationId && sageTaskContext?.target && sageTaskContext?.stepId) {
                        setAcknowledging(true);
                        setAckError(null);
                        try {
                          const res = await fetch(
                            `/api/agent/onboarding/${sageTaskContext.conversationId}/ui-actions/complete`,
                            {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                target: sageTaskContext.target,
                                step_id: sageTaskContext.stepId,
                                completed: true,
                                metadata: { source: "client", ack: "later" },
                              }),
                            }
                          );
                          if (!res.ok) {
                            const data = (await res.json().catch(() => ({}))) as { error?: string; detail?: string };
                            setAckError(data.error || data.detail || "Failed to update action status");
                            return;
                          }
                          window.dispatchEvent(new CustomEvent("sage-ui-action-acknowledged"));
                        } catch {
                          setAckError("Failed to update action status");
                          return;
                        } finally {
                          setAcknowledging(false);
                        }
                      }
                      clearSageHighlight();
                      setActiveHighlightTarget(null);
                      setSageTaskDialog({ open: false, message: "", target: null });
                      setSageTaskContext(null);
                      setSageTaskDialogPos(null);
                      setSageRightRailOpen(true);
                      sageRef.current?.resume();
                    }}
                    disabled={acknowledging}
                    className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                  >
                    I&apos;ll do it later
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (acknowledging) return;
                      if (sageTaskContext?.conversationId && sageTaskContext?.target && sageTaskContext?.stepId) {
                        setAcknowledging(true);
                        setAckError(null);
                        try {
                          const res = await fetch(
                            `/api/agent/onboarding/${sageTaskContext.conversationId}/ui-actions/complete`,
                            {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                target: sageTaskContext.target,
                                step_id: sageTaskContext.stepId,
                                completed: true,
                                metadata: { source: "client", ack: "got_it" },
                              }),
                            }
                          );
                          if (!res.ok) {
                            const data = (await res.json().catch(() => ({}))) as { error?: string; detail?: string };
                            setAckError(data.error || data.detail || "Failed to update action status");
                            return;
                          }
                          window.dispatchEvent(new CustomEvent("sage-ui-action-acknowledged"));
                        } catch {
                          setAckError("Failed to update action status");
                          return;
                        } finally {
                          setAcknowledging(false);
                        }
                      }
                      clearSageHighlight();
                      setActiveHighlightTarget(null);
                      setSageTaskDialog({ open: false, message: "", target: null });
                      setSageTaskContext(null);
                      setSageTaskDialogPos(null);
                    }}
                    disabled={acknowledging}
                    className="rounded-md bg-orange-500 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
                  >
                    Got it
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}

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
          className={
            sageRightRailOpen
              ? "fixed right-0 bottom-0 z-[40] w-[50vw] min-w-0 pl-0"
              : "pointer-events-none fixed right-0 bottom-0 z-[40] w-0 min-w-0 max-w-0 overflow-hidden border-0 p-0 pl-0"
          }
          style={{ top: headerOffsetPx }}
        >
          <SageWindow
            ref={sageRef}
            onSageLayerChange={onSageLayerChange}
            onRightRailChange={setSageRightRailOpen}
            className="h-full"
            headerOffsetPx={headerOffsetPx}
          />
        </div>
      </div>
    </div>
  );
}
