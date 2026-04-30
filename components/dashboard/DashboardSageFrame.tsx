"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { FlowEnvelopeResponse } from "@/lib/agent-onboarding-types";
import { SageWindow, type SageWindowHandle } from "@/components/dashboard/SageWindow";
import { ackFlowStepV2, ackFlowUiActionV2, getFlowV2 } from "@/lib/agent-flow-v2";
import {
  buildOnboardingTaskHref,
  getFirstPendingUiActionSorted,
  getResolvedOnboardingTaskHref,
} from "@/lib/sage-onboarding-nav";
import {
  SAGE_PRIMARY_ACTION_DONE_EVENT,
  onboardingHidesNextForPrimary,
} from "@/lib/sage-onboarding-primary";

const SAGE_TASK_NAV_CONTEXT_KEY = "opentowork-sage-task-nav-v1";
/** First match visible in the viewport — supports responsive twins (desktop vs mobile CTA). */
function queryVisibleSageTarget(selector: string): Element | null {
  let nodes: NodeListOf<Element>;
  try {
    nodes = document.querySelectorAll(selector);
  } catch {
    return null;
  }
  for (let i = 0; i < nodes.length; i++) {
    const el = nodes[i] as HTMLElement;
    const cs = window.getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    const r = el.getBoundingClientRect();
    if (r.width >= 4 && r.height >= 4) return el;
  }
  return null;
}

const SAGE_TARGET_SELECTOR: Record<string, string> = {
  "nav.experience_dashboard": "#experience-dashboard-root",
  "experience_dashboard.experience.create_cta": ".sage-highlight-exp-create",
  "experience.form.service_class": "#service_class",
  "experience.form.display_year": "#display_year",
  "experience.form.case_title": "#case_title",
  "experience.form.case_summary": "#case_summary",
  "experience.form.prototype_link": "#prototype_link",
  "experience.form.highlights": "#highlights",
  "experience.form.save": "#save-experience",
  "onboarding.congrats.experience_recorded": "#experience-created-highlight",
  "nav.campaigns_dashboard": "#projects-root",
  "campaigns_dashboard.project.create_cta": `#sage-onboarding-project-dialog-submit, [data-sage-target="create-project-cta"]`,
  "campaigns_dashboard.project.campaign.create_cta": `#sage-onboarding-campaign-dialog-submit, [data-sage-target="create-campaign-cta"]`,
  "campaign.form.title": "#campaign-title",
  "campaign.form.summary": "#campaign-summary",
  "campaign.form.call_to_action": "#campaign-cta",
  "campaign.form.link_experiences": "#campaign-link-experiences",
  "campaign.form.publish": `[data-sage-target="campaign-publish"]`,
  "campaigns.project_url.copy": "#project-url-copy",
  "onboarding.congrats.campaign_launched": "#campaign-highlight",
  "nav.profile": "#profile-nav-cta, #profile-desktop-sage-target",
  "profile.user_name.edit": "#first_name",
  "profile.resume.upload_cta": "#resumes",
  "profile.linkedin.connect_cta": "#linkedin-connect",
  "nav.sage_window": "#sage-window-root",
};

const TARGET_PREFILL_VALUE: Record<string, string> = {
  "experience.form.display_year": "2026",
  "experience.form.case_title": "Sample Onboarding Experience",
  "experience.form.case_summary": "Sample Case Summary for Onboarding Flow",
  "experience.form.highlights": "Add a Quantitative Impact here",
  "campaign.form.title": "Hire Me for XYZ Role",
  "campaign.form.summary": "Summary about me",
  "campaign.form.call_to_action": "youremail@example.com",
};

type DashboardSageFrameProps = {
  children: ReactNode;
  /** Offset from the top of the viewport so the Sage column starts below the Studio header. */
  headerOffsetPx: number;
};

type SageTaskNavContext = {
  target?: string;
  tooltip?: string;
  message?: string | null;
  createdAt?: number;
  flowInstanceId?: string | null;
  stepId?: string | null;
};

/**
 * Mounts the fixed Sage window on the Studio shell (all /dashboard/* routes) so the
 * conversation and API state survive client navigations. When the “layer” is active, the
 * rest of the app (below the header) is dimmed and blurred; the header stays clear (z-50).
 */
export function DashboardSageFrame({ children, headerOffsetPx }: DashboardSageFrameProps) {
  const [isDesktop, setIsDesktop] = useState(false);
  const [sageModeEnabled, setSageModeEnabled] = useState(true);
  const [sageLayerActive, setSageLayerActive] = useState(false);
  const [sageRightRailOpen, setSageRightRailOpen] = useState(true);
  const [sageTaskDialog, setSageTaskDialog] = useState<{
    open: boolean;
    tooltip: string;
    message: string;
    target: string | null;
  }>({
    open: false,
    tooltip: "",
    message: "",
    target: null,
  });
  const [sageTaskContext, setSageTaskContext] = useState<SageTaskNavContext | null>(null);
  const [acknowledging, setAcknowledging] = useState(false);
  const [ackError, setAckError] = useState<string | null>(null);
  /** Blocks interaction with the main canvas while a UI action ack + next-step navigation is in flight. */
  const [sageInterStepBlocking, setSageInterStepBlocking] = useState(false);
  const [sageTaskDialogPos, setSageTaskDialogPos] = useState<{ top: number; left: number } | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sageRef = useRef<SageWindowHandle>(null);
  const sageTaskDialogRef = useRef<HTMLDivElement>(null);
  const highlightedTargetRef = useRef<Element | null>(null);
  const [activeHighlightTarget, setActiveHighlightTarget] = useState<string | null>(null);

  /** Recomputes Sage tip anchor after target nodes mount async (dashboard loading, route transitions). */
  const repositionTaskDialogRef = useRef<(() => void) | null>(null);
  const sageTaskContextRef = useRef(sageTaskContext);
  const sageTourDialogOpenRef = useRef(false);
  useEffect(() => {
    sageTaskContextRef.current = sageTaskContext;
  }, [sageTaskContext]);
  useEffect(() => {
    sageTourDialogOpenRef.current = sageTaskDialog.open;
  }, [sageTaskDialog.open]);

  const isBackToSageTarget = sageTaskDialog.target === "onboarding.congrats.experience_recorded" || sageTaskDialog.target === "onboarding.congrats.campaign_launched";
  const hidesNextForPrimaryInPageOnly = onboardingHidesNextForPrimary(sageTaskDialog.target);
  const primaryActionHint =
    sageTaskDialog.target === "campaign.form.publish"
      ? "Use the highlighted Publish Campaign button to finish this step — onboarding continues only after a successful publish."
      : "Use the highlighted control (Save, Create, or Add) to finish this step.";

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const clearSageHighlight = useCallback(() => {
    if (!highlightedTargetRef.current) return;
    highlightedTargetRef.current.classList.remove("sage-target-highlight");
    highlightedTargetRef.current = null;
  }, []);

  const applyTargetPrefill = useCallback((target: string, node: Element) => {
    const prefill = TARGET_PREFILL_VALUE[target];
    if (!prefill) return;
    const el = node as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    if ("value" in el && typeof el.value === "string" && !el.value.trim()) {
      el.value = prefill;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }, []);

  const tryApplyHighlight = useCallback(
    (target: string) => {
      const selector = SAGE_TARGET_SELECTOR[target];
      if (!selector) return false;
      const node = queryVisibleSageTarget(selector);
      if (!node) return false;
      clearSageHighlight();
      node.classList.add("sage-target-highlight");
      applyTargetPrefill(target, node);
      highlightedTargetRef.current = node;
      window.requestAnimationFrame(() => repositionTaskDialogRef.current?.());
      if ("scrollIntoView" in node) {
        (node as HTMLElement).scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return true;
    },
    [applyTargetPrefill, clearSageHighlight]
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
    if (!isDesktop) setSageModeEnabled(false);

    window.setTimeout(() => {
      setActiveHighlightTarget(target);
    }, 0);

    try {
      const raw = sessionStorage.getItem(SAGE_TASK_NAV_CONTEXT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SageTaskNavContext;
        const tooltip = typeof parsed.tooltip === "string" ? parsed.tooltip.trim() : "";
        const message = typeof parsed.message === "string" ? parsed.message.trim() : "";
        if (parsed.target === target && tooltip.length > 0) {
          window.setTimeout(() => {
            setSageTaskDialog({ open: true, tooltip, message, target });
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
  }, [isDesktop, pathname, router, searchParams]);

  /** Register updatePosition ref before highlight attachment so synchronous targets can reposition immediately. */
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
      const node = queryVisibleSageTarget(selector);
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

    repositionTaskDialogRef.current = updatePosition;
    const raf = window.requestAnimationFrame(updatePosition);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      repositionTaskDialogRef.current = null;
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [sageTaskDialog.open, sageTaskDialog.target]);

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

  const closeSageTaskDialog = useCallback(() => {
    clearSageHighlight();
    setActiveHighlightTarget(null);
    setSageTaskDialog({ open: false, tooltip: "", message: "", target: null });
    setSageTaskContext(null);
    setSageTaskDialogPos(null);
  }, [clearSageHighlight]);

  const finalizeAfterUiAckFlow = useCallback(
    async (flowEnvelope: FlowEnvelopeResponse, ctx: SageTaskNavContext | null, completedTarget: string) => {
      if (!ctx?.flowInstanceId) {
        closeSageTaskDialog();
        return;
      }
      if (completedTarget === "nav.sage_window" && !isDesktop) {
        setSageModeEnabled(true);
      }
      window.dispatchEvent(new CustomEvent("sage-ui-action-acknowledged"));
      const fid = ctx.flowInstanceId;
      let nextIssued = getFirstPendingUiActionSorted(flowEnvelope);
      if (!nextIssued?.target && fid) {
        try {
          const fresh = await getFlowV2(fid);
          nextIssued = getFirstPendingUiActionSorted(fresh);
        } catch {
          // use nextIssued from ack envelope only
        }
      }
      if (nextIssued?.target && fid) {
        const base = getResolvedOnboardingTaskHref(nextIssued.target);
        if (base) {
          const tooltipTrim =
            typeof nextIssued.tooltip === "string" && nextIssued.tooltip.trim().length > 0
              ? nextIssued.tooltip.trim()
              : "Complete this onboarding step.";
          const msg =
            typeof nextIssued.message === "string"
              ? nextIssued.message.trim()
              : nextIssued.message ?? undefined;
          try {
            const navContext = {
              target: nextIssued.target,
              tooltip: tooltipTrim,
              message: msg && msg.length > 0 ? msg : undefined,
              createdAt: Date.now(),
              flowInstanceId: fid,
              stepId: ctx.stepId ?? null,
            };
            sessionStorage.setItem(SAGE_TASK_NAV_CONTEXT_KEY, JSON.stringify(navContext));
          } catch {
            // ignore storage failures
          }
          closeSageTaskDialog();
          router.push(buildOnboardingTaskHref(base, nextIssued.target), { scroll: false });
          if (
            completedTarget === "experience.form.save" ||
            completedTarget === "campaigns_dashboard.project.create_cta" ||
            completedTarget === "campaigns_dashboard.project.campaign.create_cta" ||
            completedTarget === "campaign.form.publish"
          ) {
            router.refresh();
          }
          return;
        }
      }
      closeSageTaskDialog();
    },
    [closeSageTaskDialog, isDesktop, router]
  );

  const acknowledgeAction = useCallback(
    async (state: "STEP_DONE" | "STEP_SKIPPED", backToSage: boolean) => {
      if (!sageTaskContext?.flowInstanceId || !sageTaskContext?.target) {
        closeSageTaskDialog();
        return;
      }
      setAcknowledging(true);
      setSageInterStepBlocking(true);
      setAckError(null);
      try {
        const flowEnvelope = await ackFlowUiActionV2(
          sageTaskContext.flowInstanceId,
          sageTaskContext.target,
          state,
          { source: "client" }
        );
        if (sageTaskContext.target === "nav.sage_window" && !isDesktop) {
          setSageModeEnabled(true);
        }
        if (backToSage) {
          await ackFlowStepV2(sageTaskContext.flowInstanceId, "execute_onboarding_todos", "STEP_SKIPPED");
          if (!isDesktop) setSageModeEnabled(true);
          setSageRightRailOpen(true);
          sageRef.current?.resume();
          window.dispatchEvent(new CustomEvent("sage-ui-action-acknowledged"));
          closeSageTaskDialog();
          return;
        }
        await finalizeAfterUiAckFlow(flowEnvelope, sageTaskContext, sageTaskContext.target);
      } catch (error) {
        setAckError(error instanceof Error ? error.message : "Failed to update action status");
      } finally {
        setAcknowledging(false);
        setSageInterStepBlocking(false);
      }
    },
    [closeSageTaskDialog, finalizeAfterUiAckFlow, isDesktop, sageTaskContext]
  );

  useEffect(() => {
    const onPrimaryDone = async (ev: Event) => {
      const ce = ev as CustomEvent<{ target?: unknown; markHandled?: () => void }>;
      const tgt = ce.detail?.target;
      if (
        tgt !== "experience.form.save" &&
        tgt !== "experience_dashboard.experience.create_cta" &&
        tgt !== "campaigns_dashboard.project.create_cta" &&
        tgt !== "campaigns_dashboard.project.campaign.create_cta" &&
        tgt !== "campaign.form.publish"
      ) {
        return;
      }
      const typedTarget = tgt;

      if (!sageTourDialogOpenRef.current) return;
      const ctx = sageTaskContextRef.current;
      if (!ctx?.flowInstanceId || ctx.target !== typedTarget) return;

      ce.detail.markHandled?.();

      setAcknowledging(true);
      setSageInterStepBlocking(true);
      setAckError(null);
      try {
        const flowEnvelope = await ackFlowUiActionV2(ctx.flowInstanceId, typedTarget, "STEP_DONE", {
          source: "client",
          via: "primary_action",
        });
        await finalizeAfterUiAckFlow(flowEnvelope, ctx, typedTarget);
      } catch (error) {
        setAckError(error instanceof Error ? error.message : "Failed to update action status");
      } finally {
        setAcknowledging(false);
        setSageInterStepBlocking(false);
      }
    };
    window.addEventListener(SAGE_PRIMARY_ACTION_DONE_EVENT, onPrimaryDone);
    return () => window.removeEventListener(SAGE_PRIMARY_ACTION_DONE_EVENT, onPrimaryDone);
  }, [finalizeAfterUiAckFlow]);

  return (
    <div className="relative flex min-h-0 w-full min-w-0 flex-1 flex-col">
      <div className={isDesktop || !sageModeEnabled ? "" : "hidden"}>{children}</div>
      {sageInterStepBlocking ? (
        <div
          className="fixed inset-0 z-[52] flex items-center justify-center bg-zinc-950/40 p-6 backdrop-blur-[2px] dark:bg-black/50"
          role="status"
          aria-live="polite"
          aria-busy="true"
          aria-label="Loading onboarding step"
        >
          <div className="max-w-sm rounded-xl border border-zinc-200 bg-white px-5 py-4 text-center shadow-xl dark:border-zinc-600 dark:bg-zinc-900">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Preparing your next step</p>
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">Please wait — the tour will continue in a moment.</p>
          </div>
        </div>
      ) : null}
      <style jsx global>{`
        .sage-target-highlight {
          outline: 3px solid rgba(245, 158, 11, 0.9);
          outline-offset: 4px;
          box-shadow: 0 0 0 6px rgba(251, 191, 36, 0.28);
          z-index: 49 !important;
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
          <div className="pointer-events-none fixed inset-0 z-[54] bg-black/18" aria-hidden />
          <div
            ref={sageTaskDialogRef}
            className="pointer-events-auto fixed z-[56] w-[min(22.5rem,calc(100vw-1.5rem))] rounded-xl border border-zinc-200 bg-white p-4 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
            role="dialog"
            aria-modal="true"
            style={{
              top: sageTaskDialogPos?.top ?? 24,
              left: sageTaskDialogPos?.left ?? 24,
            }}
          >
            <div className="flex w-full items-start gap-3">
              <Image
                src="/sage_mascot.png"
                alt="Sage"
                width={44}
                height={56}
                className="mt-0.5 h-10 w-auto shrink-0 object-contain"
              />
              <div className="flex min-w-0 flex-1 flex-col">
                <h2 className="text-lg font-semibold text-black dark:text-zinc-50">{sageTaskDialog.tooltip}</h2>
                {sageTaskDialog.message ? (
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{sageTaskDialog.message}</p>
                ) : null}
                {hidesNextForPrimaryInPageOnly && !isBackToSageTarget ? (
                  <p className="mt-2 text-xs leading-snug text-zinc-500 dark:text-zinc-400">{primaryActionHint}</p>
                ) : null}
                <div className="mt-4 flex w-full flex-wrap items-center justify-end gap-2">
                  {ackError ? (
                    <p className="w-full text-xs text-red-600 dark:text-red-400">{ackError}</p>
                  ) : null}
                  {isBackToSageTarget ? (
                    <button
                      type="button"
                      onClick={() => void acknowledgeAction("STEP_SKIPPED", true)}
                      disabled={acknowledging}
                      className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                    >
                      Back to Sage
                    </button>
                  ) : null}
                  {!isBackToSageTarget && !hidesNextForPrimaryInPageOnly ? (
                    <button
                      type="button"
                      onClick={() => void acknowledgeAction("STEP_DONE", false)}
                      disabled={acknowledging}
                      className="rounded-md bg-orange-500 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
                    >
                      Next
                    </button>
                  ) : null}
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
            className="pointer-events-none fixed inset-0 z-[32] bg-zinc-900/20 backdrop-blur-md dark:bg-black/35"
            role="presentation"
            aria-hidden
          />
        ) : null}

        {sageLayerActive ? (
          <div
            className="pointer-events-none fixed bottom-8 right-[calc(50vw+1.75rem)] z-[36] flex max-w-[19rem] flex-col items-center gap-3"
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
          id="sage-window-root"
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

      {!isDesktop ? (
        <>
          <button
            type="button"
            onClick={() => setSageModeEnabled((prev) => !prev)}
            className="fixed right-2 top-1/2 z-[60] -translate-y-1/2 rounded-full border border-orange-300 bg-white px-2 py-3 text-xs font-semibold text-orange-800 shadow-md dark:border-orange-700 dark:bg-zinc-900 dark:text-orange-200 lg:hidden"
            aria-label={sageModeEnabled ? "Disable Sage mode" : "Enable Sage mode"}
          >
            {sageModeEnabled ? "Sage On" : "Sage Off"}
          </button>
          {sageModeEnabled ? (
            <div className="fixed inset-0 z-[55] bg-orange-50 dark:bg-zinc-950 lg:hidden" style={{ top: headerOffsetPx }}>
              <div id="sage-window-root" className="h-full">
                <SageWindow
                  ref={sageRef}
                  onSageLayerChange={onSageLayerChange}
                  onRightRailChange={setSageRightRailOpen}
                  className="h-full"
                  headerOffsetPx={headerOffsetPx}
                />
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
