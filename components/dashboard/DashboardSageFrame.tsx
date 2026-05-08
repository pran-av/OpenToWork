"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { cn } from "@/lib/utils";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { FlowEnvelopeResponse } from "@/lib/agent-onboarding-types";
import {
  SageWindow,
  type SageWindowHandle,
  SAGE_RESUME_FROM_TOUR_EVENT,
  SAGE_SESSION_KEY,
  SAGE_MOBILE_MODE_PREFERENCE_EVENT,
  type SagePersistedSession,
  persistedSessionOnboardingComplete,
  setSageMobileUserHoldOpen,
  sageMobileUserHoldOpen,
  dismissMobileSageOverlayBeforeOnboardingNav,
} from "@/components/dashboard/SageWindow";
import { ackFlowUiActionV2, getFlowV2 } from "@/lib/agent-flow-v2";
import {
  buildOnboardingTaskHref,
  getFirstPendingUiActionSorted,
  getResolvedOnboardingTaskHref,
} from "@/lib/sage-onboarding-nav";
import {
  SAGE_PRIMARY_ACTION_DONE_EVENT,
  SAGE_PROFILE_VERIFICATION_DONE_EVENT,
  onboardingHidesNextForPrimary,
  onboardingProfileRequiresDbVerification,
  type SageProfileVerificationTarget,
} from "@/lib/sage-onboarding-primary";

const SAGE_TASK_NAV_CONTEXT_KEY = "opentowork-sage-task-nav-v1";

/** Short pause after closing the tour before navigating so the UI can settle (off when reduced motion). */
async function sageOnboardingStepYield(): Promise<void> {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  await new Promise<void>((resolve) => window.setTimeout(resolve, 120));
}

function sagePrefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

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

/**
 * Footer / sheet CTAs where “above” blocks sibling actions (Cancel, Save Draft, etc.).
 * Prefer below + extra tail gap on all viewports.
 */
const SAGE_MODAL_STEP_TARGETS = new Set<string>([
  "campaigns_dashboard.project.campaign.create_cta",
  "campaigns_dashboard.project.create_cta",
  /** Publish sits next to Save — keep dialog under the Publish button so Save stays visible (esp. desktop). */
  "campaign.form.publish",
]);

const SAGE_MODAL_BELOW_EXTRA_GAP_PX = 28;

type SageDialogTopNudge = { desktop: number; mobile: number };

function resolveSageDialogTopNudge(
  spec: SageDialogTopNudge | undefined,
  isLgViewport: boolean
): number {
  if (!spec) return 0;
  return isLgViewport ? spec.desktop : spec.mobile;
}

/** Extra `top` after pick; mobile uses a larger value so offset survives clamping on short viewports. */
const SAGE_TASK_DIALOG_TOP_NUDGE: Partial<Record<string, SageDialogTopNudge>> = {
  /* Desktop: extra push below modal footers (Cancel / Create) so the tour card doesn’t cover them. */
  "campaigns_dashboard.project.campaign.create_cta": { desktop: 118, mobile: 140 },
  "campaigns_dashboard.project.create_cta": { desktop: 118, mobile: 140 },
};

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
  "campaigns_dashboard.project.create_cta": `#sage-onboarding-project-dialog, #sage-onboarding-project-dialog-submit, [data-sage-target="create-project-cta"]`,
  "campaigns_dashboard.project.campaign.create_cta": `#sage-onboarding-campaign-dialog, #sage-onboarding-campaign-dialog-submit, [data-sage-target="create-campaign-cta"]`,
  "campaign.form.title": "#campaign-title",
  "campaign.form.summary": "#campaign-summary",
  "campaign.form.call_to_action": "#campaign-cta",
  "campaign.form.link_experiences": "#campaign-link-experiences",
  "campaign.form.publish": `[data-sage-target="campaign-publish"]`,
  "campaigns.project_url.copy": "#project-url-copy",
  "onboarding.congrats.campaign_launched": "#campaign-highlight",
  "nav.profile": "#profile-nav-cta, #profile-desktop-sage-target",
  "profile.user_name.edit": "#profile-personal-information",
  "profile.resume.upload_cta": "#resumes",
  "profile.linkedin.connect_cta": "#linkedin-connect",
  "nav.sage_window": "#sage-window-root",
};

function getPreferredSageTargetNode(target: string, selector: string): Element | null {
  if (target === "campaigns_dashboard.project.create_cta") {
    const dialogNode = queryVisibleSageTarget("#sage-onboarding-project-dialog");
    if (dialogNode) return dialogNode;
  }
  if (target === "campaigns_dashboard.project.campaign.create_cta") {
    const dialogNode = queryVisibleSageTarget("#sage-onboarding-campaign-dialog");
    if (dialogNode) return dialogNode;
  }
  return queryVisibleSageTarget(selector);
}

const PROFILE_VERIFICATION_HINTS: Record<SageProfileVerificationTarget, string> = {
  "profile.user_name.edit":
    "Save your first and last name using Save Changes. This step completes only after your profile saves successfully.",
  "profile.resume.upload_cta":
    "Upload a PDF using the resumes section below. This step completes only after the upload succeeds.",
  "profile.linkedin.connect_cta":
    "Finish LinkedIn OAuth. This step completes only after your account is linked.",
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
  /** Signal fullscreen Sage flow mode so shell chrome can be hidden. */
  onFlowOverlayChange?: (active: boolean) => void;
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
export function DashboardSageFrame({
  children,
  headerOffsetPx,
  onFlowOverlayChange,
}: DashboardSageFrameProps) {
  const [isDesktop, setIsDesktop] = useState(false);
  const [sageModeEnabled, setSageModeEnabled] = useState(false);
  const [sageLayerActive, setSageLayerActive] = useState(false);
  const [sageRightRailOpen, setSageRightRailOpen] = useState(false);
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
  const [sageHighlightRect, setSageHighlightRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
    radius: number;
  } | null>(null);
  /** When true, keep `sageInterStepBlocking` until the next `sageTaskDialog` opens (after chained navigation). */
  const interStepOverlayHoldForNextDialogRef = useRef(false);

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

  useEffect(() => {
    if (!sageTaskDialog.open || !interStepOverlayHoldForNextDialogRef.current) return;
    interStepOverlayHoldForNextDialogRef.current = false;
    setSageInterStepBlocking(false);
  }, [sageTaskDialog.open]);

  useEffect(() => {
    if (!sageInterStepBlocking || !interStepOverlayHoldForNextDialogRef.current) return;
    if (sageTaskDialog.open) return;
    const id = window.setTimeout(() => {
      interStepOverlayHoldForNextDialogRef.current = false;
      setSageInterStepBlocking(false);
    }, 12_000);
    return () => window.clearTimeout(id);
  }, [sageInterStepBlocking, sageTaskDialog.open]);

  const isBackToSageTarget = sageTaskDialog.target === "onboarding.congrats.experience_recorded" || sageTaskDialog.target === "onboarding.congrats.campaign_launched";
  const hidesNextForPrimaryInPageOnly = onboardingHidesNextForPrimary(sageTaskDialog.target);
  const hidesNextForProfileVerification = onboardingProfileRequiresDbVerification(sageTaskDialog.target);
  const hidesNextTourAction = hidesNextForPrimaryInPageOnly || hidesNextForProfileVerification;
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

  /** After onboarding completes, default mobile/tablet Sage overlay OFF before first paint when session says so. */
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(min-width: 1024px)").matches) return;
    try {
      const raw = sessionStorage.getItem(SAGE_SESSION_KEY);
      if (!raw) return;
      const snap = JSON.parse(raw) as SagePersistedSession;
      if (snap.v !== 1) return;
      if (persistedSessionOnboardingComplete(snap) && !sageMobileUserHoldOpen())
        setSageModeEnabled(false);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const handler: EventListener = (e) => {
      if (typeof window === "undefined") return;
      if (window.matchMedia("(min-width: 1024px)").matches) return;
      const ce = e as CustomEvent<{ enabled?: boolean }>;
      if (typeof ce.detail?.enabled === "boolean") setSageModeEnabled(ce.detail.enabled);
    };
    window.addEventListener(SAGE_MOBILE_MODE_PREFERENCE_EVENT, handler);
    return () => window.removeEventListener(SAGE_MOBILE_MODE_PREFERENCE_EVENT, handler);
  }, []);

  const clearSageHighlight = useCallback(() => {
    setSageHighlightRect(null);
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
      const node = getPreferredSageTargetNode(target, selector);
      if (!node) return false;
      clearSageHighlight();
      node.classList.add("sage-target-highlight");
      applyTargetPrefill(target, node);
      highlightedTargetRef.current = node;
      window.requestAnimationFrame(() => repositionTaskDialogRef.current?.());
      if ("scrollIntoView" in node) {
        (node as HTMLElement).scrollIntoView({
          behavior: sagePrefersReducedMotion() ? "auto" : "smooth",
          /* "nearest" preserves space above tall sections so the dialog can sit clear of the highlight */
          block: "nearest",
        });
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
    onFlowOverlayChange?.((isDesktop && sageLayerActive) || (!isDesktop && sageModeEnabled));
  }, [isDesktop, onFlowOverlayChange, sageLayerActive, sageModeEnabled]);

  useEffect(() => {
    const target = searchParams.get("sage_highlight");
    if (!target) return;
    if (!isDesktop && !sageMobileUserHoldOpen()) setSageModeEnabled(false);

    const reduceMotion = sagePrefersReducedMotion();
    window.setTimeout(
      () => {
        setActiveHighlightTarget(target);
      },
      reduceMotion ? 0 : 40
    );

    try {
      const raw = sessionStorage.getItem(SAGE_TASK_NAV_CONTEXT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SageTaskNavContext;
        const tooltip = typeof parsed.tooltip === "string" ? parsed.tooltip.trim() : "";
        const message = typeof parsed.message === "string" ? parsed.message.trim() : "";
        if (parsed.target === target && tooltip.length > 0) {
          window.setTimeout(
            () => {
              setSageTaskDialog({ open: true, tooltip, message, target });
              setSageTaskContext(parsed);
              setAckError(null);
            },
            reduceMotion ? 0 : 100
          );
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
      const node = getPreferredSageTargetNode(sageTaskDialog.target ?? "", selector);
      if (!node) {
        setSageHighlightRect(null);
        return;
      }
      const rect = (node as HTMLElement).getBoundingClientRect();
      const highlightPadding = 8;
      setSageHighlightRect({
        top: Math.max(8, rect.top - highlightPadding),
        left: Math.max(8, rect.left - highlightPadding),
        width: Math.max(8, rect.width + highlightPadding * 2),
        height: Math.max(8, rect.height + highlightPadding * 2),
        radius: 12,
      });
      const cardNode = sageTaskDialogRef.current;
      const viewportW = window.innerWidth;
      const viewportH = window.innerHeight;
      const cardWidth = Math.min(cardNode?.offsetWidth ?? 360, viewportW - 24);
      const cardHeight = Math.min(cardNode?.offsetHeight ?? 190, viewportH - 24);
      const gap = 14;
      const padding = 12;
      const isLgViewport = window.matchMedia("(min-width: 1024px)").matches;
      const topNudge = resolveSageDialogTopNudge(
        SAGE_TASK_DIALOG_TOP_NUDGE[sageTaskDialog.target ?? ""],
        isLgViewport
      );

      const anchorRect = {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      };

      const targetKey = sageTaskDialog.target ?? "";
      const isModalStep = SAGE_MODAL_STEP_TARGETS.has(targetKey);
      const belowTailGap = gap + (isModalStep ? SAGE_MODAL_BELOW_EXTRA_GAP_PX : 0);

      const above = {
        left: rect.left + rect.width / 2 - cardWidth / 2,
        top: rect.top - cardHeight - gap,
      };
      const below = {
        left: rect.left + rect.width / 2 - cardWidth / 2,
        top: rect.bottom + belowTailGap,
      };
      const right = {
        left: rect.right + gap,
        top: rect.top + rect.height / 2 - cardHeight / 2,
      };
      const left = {
        left: rect.left - cardWidth - gap,
        top: rect.top + rect.height / 2 - cardHeight / 2,
      };

      const preferBelowFirst = isModalStep;
      const rawOrder = preferBelowFirst ? [below, above, right, left] : [above, below, right, left];

      const candidates = rawOrder.map((c) => ({
        left: clamp(c.left, padding, viewportW - cardWidth - padding),
        top: clamp(c.top, padding, viewportH - cardHeight - padding),
        width: cardWidth,
        height: cardHeight,
      }));

      const nonOverlapping = candidates.find((c) => !overlaps(c, anchorRect));
      if (nonOverlapping) {
        setSageTaskDialogPos({
          top: clamp(nonOverlapping.top + topNudge, padding, viewportH - cardHeight - padding),
          left: nonOverlapping.left,
        });
        return;
      }

      // Fallback: pick the position with smallest overlap area.
      const score = (c: { left: number; top: number; width: number; height: number }) => {
        const x = Math.max(0, Math.min(c.left + c.width, anchorRect.left + anchorRect.width) - Math.max(c.left, anchorRect.left));
        const y = Math.max(0, Math.min(c.top + c.height, anchorRect.top + anchorRect.height) - Math.max(c.top, anchorRect.top));
        return x * y;
      };
      const best = candidates.sort((a, b) => score(a) - score(b))[0];
      setSageTaskDialogPos({
        top: clamp(best.top + topNudge, padding, viewportH - cardHeight - padding),
        left: best.left,
      });
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

  /** Re-open Sage after an onboarding dialog (e.g. “Back to Sage”): mount mobile overlay synchronously, then resume + hydrate. */
  const openSageAfterTourReturn = useCallback(() => {
    if (!isDesktop) {
      flushSync(() => {
        /** Same contract as manual ON: hydrate must not dismiss via `emitMobileSageModePreferenceIfMobile(false)`. */
        setSageMobileUserHoldOpen(true);
        setSageModeEnabled(true);
      });
    }
    setSageRightRailOpen(true);
    queueMicrotask(() => {
      if (sageRef.current) {
        sageRef.current.resume();
      } else {
        window.dispatchEvent(new CustomEvent(SAGE_RESUME_FROM_TOUR_EVENT));
      }
    });
  }, [isDesktop]);

  const finalizeAfterUiAckFlow = useCallback(
    async (flowEnvelope: FlowEnvelopeResponse, ctx: SageTaskNavContext | null, completedTarget: string) => {
      interStepOverlayHoldForNextDialogRef.current = false;
      if (!ctx?.flowInstanceId) {
        closeSageTaskDialog();
        return;
      }
      if (completedTarget === "nav.sage_window" && !isDesktop) {
        flushSync(() => {
          setSageMobileUserHoldOpen(true);
          setSageModeEnabled(true);
        });
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
          interStepOverlayHoldForNextDialogRef.current = true;
          closeSageTaskDialog();
          await sageOnboardingStepYield();
          dismissMobileSageOverlayBeforeOnboardingNav();
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
      if (completedTarget === "nav.sage_window") {
        openSageAfterTourReturn();
      }
    },
    [closeSageTaskDialog, isDesktop, openSageAfterTourReturn, router]
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
        const uiAckState: "STEP_DONE" | "STEP_SKIPPED" = backToSage ? "STEP_DONE" : state;
        const flowEnvelope = await ackFlowUiActionV2(
          sageTaskContext.flowInstanceId,
          sageTaskContext.target,
          uiAckState,
          { source: "client" }
        );
        if (!backToSage && sageTaskContext.target === "nav.sage_window" && !isDesktop) {
          flushSync(() => {
            setSageMobileUserHoldOpen(true);
            setSageModeEnabled(true);
          });
        }
        if (backToSage) {
          openSageAfterTourReturn();
          window.dispatchEvent(new CustomEvent("sage-ui-action-acknowledged"));
          closeSageTaskDialog();
          return;
        }
        await finalizeAfterUiAckFlow(flowEnvelope, sageTaskContext, sageTaskContext.target);
      } catch (error) {
        interStepOverlayHoldForNextDialogRef.current = false;
        setAckError(error instanceof Error ? error.message : "Failed to update action status");
      } finally {
        setAcknowledging(false);
        if (!interStepOverlayHoldForNextDialogRef.current) {
          setSageInterStepBlocking(false);
        }
      }
    },
    [closeSageTaskDialog, finalizeAfterUiAckFlow, isDesktop, openSageAfterTourReturn, sageTaskContext]
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
        interStepOverlayHoldForNextDialogRef.current = false;
        setAckError(error instanceof Error ? error.message : "Failed to update action status");
      } finally {
        setAcknowledging(false);
        if (!interStepOverlayHoldForNextDialogRef.current) {
          setSageInterStepBlocking(false);
        }
      }
    };
    window.addEventListener(SAGE_PRIMARY_ACTION_DONE_EVENT, onPrimaryDone);
    return () => window.removeEventListener(SAGE_PRIMARY_ACTION_DONE_EVENT, onPrimaryDone);
  }, [finalizeAfterUiAckFlow]);

  useEffect(() => {
    const onProfileVerificationDone = async (ev: Event) => {
      const ce = ev as CustomEvent<{ target?: string }>;
      const tgt = ce.detail?.target;
      if (
        tgt !== "profile.user_name.edit" &&
        tgt !== "profile.resume.upload_cta" &&
        tgt !== "profile.linkedin.connect_cta"
      ) {
        return;
      }
      const typedTarget = tgt as SageProfileVerificationTarget;

      if (!sageTourDialogOpenRef.current) return;
      const ctx = sageTaskContextRef.current;
      if (!ctx?.flowInstanceId || ctx.target !== typedTarget) return;

      setAcknowledging(true);
      setSageInterStepBlocking(true);
      setAckError(null);
      try {
        const flowEnvelope = await ackFlowUiActionV2(ctx.flowInstanceId, typedTarget, "STEP_DONE", {
          source: "client",
          via: "db_verification",
        });
        await finalizeAfterUiAckFlow(flowEnvelope, ctx, typedTarget);
      } catch (error) {
        interStepOverlayHoldForNextDialogRef.current = false;
        setAckError(error instanceof Error ? error.message : "Failed to update action status");
      } finally {
        setAcknowledging(false);
        if (!interStepOverlayHoldForNextDialogRef.current) {
          setSageInterStepBlocking(false);
        }
      }
    };
    window.addEventListener(SAGE_PROFILE_VERIFICATION_DONE_EVENT, onProfileVerificationDone);
    return () => window.removeEventListener(SAGE_PROFILE_VERIFICATION_DONE_EVENT, onProfileVerificationDone);
  }, [finalizeAfterUiAckFlow]);

  return (
    <div className="relative flex min-h-0 w-full min-w-0 flex-1 flex-col">
      <div
        className={cn(
          "flex min-h-0 w-full min-w-0 flex-1 flex-col",
          !isDesktop && sageModeEnabled && "hidden"
        )}
      >
        {children}
      </div>
      {sageInterStepBlocking ? (
        <div
          className="fixed inset-0 z-[52] flex items-center justify-center bg-zinc-950/40 p-6 backdrop-blur-[2px] motion-safe:transition-opacity motion-safe:duration-200 motion-safe:ease-out dark:bg-black/50"
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
          position: relative;
          outline: 3px solid rgba(245, 158, 11, 0.9);
          outline-offset: 4px;
          box-shadow: 0 0 0 6px rgba(251, 191, 36, 0.28);
          z-index: 49 !important;
          transition:
            outline 0.22s ease,
            outline-offset 0.22s ease,
            box-shadow 0.22s ease;
          animation: sage-highlight-pulse 1.2s ease-in-out 2;
        }
        :root:not(.dark) .sage-target-highlight {
          /* Keep focus ring visible while spotlight hole handles dimming. */
          z-index: 53 !important;
        }
        @media (prefers-reduced-motion: reduce) {
          .sage-target-highlight {
            animation: none;
          }
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
          {sageHighlightRect ? (
            <div
              className="pointer-events-none fixed z-[54] motion-safe:transition-[top,left,width,height] motion-safe:duration-150 motion-safe:ease-out"
              style={{
                top: sageHighlightRect.top,
                left: sageHighlightRect.left,
                width: sageHighlightRect.width,
                height: sageHighlightRect.height,
                borderRadius: sageHighlightRect.radius,
                boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.18)",
              }}
              aria-hidden
            />
          ) : (
            <div
              className="pointer-events-none fixed inset-0 z-[54] bg-black/18 motion-safe:transition-opacity motion-safe:duration-200 motion-safe:ease-out"
              aria-hidden
            />
          )}
          <div
            ref={sageTaskDialogRef}
            className="pointer-events-auto fixed z-[56] w-[min(22.5rem,calc(100vw-1.5rem))] rounded-xl border border-zinc-200 bg-white p-4 shadow-xl motion-safe:origin-top motion-safe:transition-[opacity,transform] motion-safe:duration-200 motion-safe:ease-out dark:border-zinc-700 dark:bg-zinc-900"
            role="dialog"
            aria-modal="true"
            style={{
              top: sageTaskDialogPos?.top ?? 24,
              left: sageTaskDialogPos?.left ?? 24,
            }}
          >
            <div className="flex w-full items-start gap-3">
              <div className="flex min-w-0 flex-1 flex-col">
                <h2 className="text-lg font-semibold text-black dark:text-zinc-50">{sageTaskDialog.tooltip}</h2>
                {sageTaskDialog.message ? (
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{sageTaskDialog.message}</p>
                ) : null}
                {hidesNextTourAction && !isBackToSageTarget ? (
                  <p className="mt-2 text-xs leading-snug text-zinc-500 dark:text-zinc-400">
                    {hidesNextForProfileVerification
                      ? PROFILE_VERIFICATION_HINTS[
                          sageTaskDialog.target as SageProfileVerificationTarget
                        ] ?? "Complete the highlighted step on the page to continue."
                      : primaryActionHint}
                  </p>
                ) : null}
                <div className="mt-4 flex w-full flex-wrap items-center justify-end gap-2">
                  {ackError ? (
                    <p className="w-full text-xs text-red-600 dark:text-red-400">{ackError}</p>
                  ) : null}
                  {isBackToSageTarget ? (
                    <button
                      type="button"
                      onClick={() => void acknowledgeAction("STEP_DONE", true)}
                      disabled={acknowledging}
                      className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                    >
                      Back to Sage
                    </button>
                  ) : null}
                  {hidesNextForProfileVerification ? (
                    <button
                      type="button"
                      onClick={() => void acknowledgeAction("STEP_SKIPPED", false)}
                      disabled={acknowledging}
                      className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                    >
                      Skip
                    </button>
                  ) : null}
                  {!hidesNextTourAction ? (
                    <button
                      type="button"
                      onClick={() => void acknowledgeAction("STEP_DONE", false)}
                      disabled={acknowledging}
                      className="rounded-md bg-orange-500 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
                    >
                      {sageTaskDialog.target === "nav.sage_window" ? "Back to Sage window" : "Next"}
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
        <div
          id="sage-window-root"
          className={
            sageRightRailOpen
              ? "fixed inset-x-0 bottom-0 z-[40] min-w-0 bg-orange-50 dark:bg-zinc-950"
              : "pointer-events-none invisible fixed inset-x-0 bottom-0 z-[40] min-w-0 overflow-hidden border-0 p-0 opacity-0"
          }
          style={{ top: headerOffsetPx }}
        >
          {/*
            Mount Sage only for lg+ here. On smaller viewports the mobile overlay instance mounts below.
            Two instances raced bootstrap (parallel POST start / show conversation list on the visible copy).
          */}
          {isDesktop ? (
            <SageWindow
              ref={sageRef}
              onSageLayerChange={onSageLayerChange}
              onRightRailChange={setSageRightRailOpen}
              className="mx-auto h-full w-full max-w-5xl"
              headerOffsetPx={headerOffsetPx}
            />
          ) : null}
        </div>
      </div>

      {!isDesktop ? (
        <>
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
