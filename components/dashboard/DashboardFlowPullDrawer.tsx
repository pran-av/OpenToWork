"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import flowBannerConfig from "@/lib/dashboard-flow-banners.json";
import {
  listActiveOnboardingFlowsV2,
  listCompletedOnboardingFlowsV2,
} from "@/lib/agent-flow-v2";
import {
  SAGE_FLOW_PREPARE_UI_DONE_EVENT,
  SAGE_MOBILE_MODE_PREFERENCE_EVENT,
  SAGE_ONBOARDING_COMPLETED_KEY,
  SAGE_OPEN_ONBOARDING_FLOW_EVENT,
  setSageMobileUserHoldOpen,
} from "@/components/dashboard/SageWindow";

type FlowDrawerStatus = "idle" | "available" | "pending" | "completed";

type FlowCtaKind = "available" | "pending" | "completed";

type DashboardFlowBannerKey = Exclude<keyof typeof flowBannerConfig, "_comment">;

type DashboardFlowPullDrawerProps = {
  bannerKey: DashboardFlowBannerKey;
};

export default function DashboardFlowPullDrawer({ bannerKey }: DashboardFlowPullDrawerProps) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<FlowDrawerStatus>("idle");
  const [pendingFlowId, setPendingFlowId] = useState<string | null>(null);
  const [completedFlowId, setCompletedFlowId] = useState<string | null>(null);
  const [flowCtaPreparing, setFlowCtaPreparing] = useState<FlowCtaKind | null>(null);

  const refreshFlowState = useCallback(async () => {
    try {
      const flows = await listActiveOnboardingFlowsV2();
      const onboarding = flows.find(
        (f) => (f.flow_instance.flow_type ?? "").trim().toUpperCase() === "ONBOARDING"
      );
      if (onboarding) {
        setStatus("pending");
        setPendingFlowId(onboarding.flow_instance.id);
        setCompletedFlowId(null);
        return {
          status: "pending" as const,
          pendingFlowId: onboarding.flow_instance.id,
          completedFlowId: null,
        };
      }
    } catch {
      // continue: completed lookup can still provide best-effort state
    }

    try {
      const completed = await listCompletedOnboardingFlowsV2();
      const onboardingCompleted = completed
        .filter((f) => (f.flow_instance.flow_type ?? "").trim().toUpperCase() === "ONBOARDING")
        .sort((a, b) =>
          (b.flow_instance.started_at ?? "").localeCompare(a.flow_instance.started_at ?? "")
        );
      const hasCompleted = onboardingCompleted.length > 0;
      setPendingFlowId(null);
      setCompletedFlowId(hasCompleted ? onboardingCompleted[0].flow_instance.id : null);
      setStatus(hasCompleted ? "completed" : "available");
      return {
        status: hasCompleted ? ("completed" as const) : ("available" as const),
        pendingFlowId: null,
        completedFlowId: hasCompleted ? onboardingCompleted[0].flow_instance.id : null,
      };
    } catch {
      // fall through
    }

    setPendingFlowId(null);
    setCompletedFlowId(null);
    setStatus("available");
    return {
      status: "available" as const,
      pendingFlowId: null,
      completedFlowId: null,
    };
  }, []);

  /** Server truth for strip + drawer; run on mount so we don’t show “available” until we know. */
  useEffect(() => {
    void refreshFlowState();
  }, [refreshFlowState]);

  /** Fast path after UX finish: avoids a frame of wrong chrome before `listCompleted` returns. */
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      if (window.localStorage.getItem(SAGE_ONBOARDING_COMPLETED_KEY) !== "1") return;
      setStatus((prev) => (prev === "pending" ? prev : "completed"));
    } catch {
      // ignore storage restrictions
    }
  }, []);

  const pullLabel = useMemo(() => {
    if (status === "pending") return "Continue Onboarding";
    if (status === "available") return "Onboarding Flow Available";
    return "Open Flow Panel";
  }, [status]);

  useEffect(() => {
    const onPrepareDone = () => {
      setFlowCtaPreparing(null);
      setOpen(false);
    };
    window.addEventListener(SAGE_FLOW_PREPARE_UI_DONE_EVENT, onPrepareDone);
    return () => window.removeEventListener(SAGE_FLOW_PREPARE_UI_DONE_EVENT, onPrepareDone);
  }, []);

  const isHighlighted = status === "available";

  const triggerOnboardingFlow = (
    kind: FlowCtaKind,
    overrides?: { pendingFlowId: string | null; completedFlowId: string | null }
  ) => {
    setFlowCtaPreparing(kind);
    if (typeof window !== "undefined" && !window.matchMedia("(min-width: 1024px)").matches) {
      setSageMobileUserHoldOpen(true);
      window.dispatchEvent(
        new CustomEvent(SAGE_MOBILE_MODE_PREFERENCE_EVENT, { detail: { enabled: true } })
      );
    }
    window.setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent(SAGE_OPEN_ONBOARDING_FLOW_EVENT, {
          detail: {
            resumeFlowInstanceId:
              kind === "pending"
                ? (overrides?.pendingFlowId ?? pendingFlowId)
                : kind === "completed"
                  ? (overrides?.completedFlowId ?? completedFlowId)
                  : null,
            forceStart: kind === "available",
            prepareUiOnFlowCta: true,
          },
        })
      );
    }, 0);
  };

  const flowCtaDisabled = flowCtaPreparing !== null;
  const bannerContent = flowBannerConfig[bannerKey];
  const ctaLabel = pullLabel;
  const isFlowPanelCta = status === "idle" || status === "completed";
  const ctaDisabled = isFlowPanelCta ? false : flowCtaDisabled;

  const openFlowPanel = async () => {
    await refreshFlowState();
    setOpen(true);
  };

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={async () => {
          await openFlowPanel();
        }}
        onKeyDown={async (event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          await openFlowPanel();
        }}
        className={cn(
          "flex min-h-[84px] w-full cursor-pointer items-center justify-between gap-4 rounded-xl border px-5 py-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-900",
          isHighlighted
            ? "border-orange-300 bg-orange-50 hover:bg-orange-100 dark:border-orange-700 dark:bg-orange-900/30 dark:hover:bg-orange-900/40"
            : "border-zinc-300 bg-zinc-50 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800/70 dark:hover:bg-zinc-800"
        )}
        aria-label={`${pullLabel}. Open flow panel.`}
      >
        <div className="min-w-0">
          <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{bannerContent.title}</p>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{bannerContent.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={async (event) => {
            event.stopPropagation();
            if (isFlowPanelCta) {
              await openFlowPanel();
              return;
            }
            const latest = await refreshFlowState();
            if (latest.status === "pending") {
              triggerOnboardingFlow("pending", latest);
              return;
            }
            if (latest.status === "completed") {
              triggerOnboardingFlow("completed", latest);
              return;
            }
            triggerOnboardingFlow("available", latest);
          }}
          disabled={ctaDisabled}
          aria-label={`${ctaLabel}.`}
          className={cn(
            "shrink-0 rounded-full border px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60",
            isHighlighted
              ? "border-orange-300 bg-orange-100 text-orange-900 dark:border-orange-700 dark:bg-orange-900/50 dark:text-orange-100"
              : "border-zinc-300 bg-white text-zinc-700 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300"
          )}
        >
          {ctaLabel}
        </button>
      </div>

      {open
        ? createPortal(
            <div className="fixed inset-0 z-[120] bg-white dark:bg-zinc-950">
              <div className="mx-auto flex h-full w-full max-w-5xl flex-col px-6 py-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Flows</h2>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="text-sm font-medium text-zinc-700 underline-offset-2 hover:underline dark:text-zinc-300"
                  >
                    Close
                  </button>
                </div>

                <div className="mt-8">
                  <h3 className="text-2xl font-medium text-zinc-900 dark:text-zinc-100">Available Flows</h3>
                  {status === "available" || status === "pending" ? (
                    <div className="mt-4">
                      <button
                        type="button"
                        disabled={flowCtaDisabled}
                        onClick={() => triggerOnboardingFlow(status)}
                        className={cn(
                          "flex w-48 flex-col items-start gap-2 rounded-xl border p-3 text-left transition-colors disabled:opacity-60",
                          flowCtaPreparing === status
                            ? "border-orange-300 bg-orange-50 dark:border-orange-700 dark:bg-orange-950/40"
                            : "border-zinc-300 bg-white hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800",
                          flowCtaDisabled && flowCtaPreparing !== status && "pointer-events-none opacity-50"
                        )}
                        aria-busy={flowCtaPreparing === status}
                      >
                        <span
                          className={cn(
                            "inline-flex h-10 w-10 items-center justify-center rounded-lg border",
                            flowCtaPreparing === status
                              ? "border-orange-400 bg-orange-100 dark:border-orange-600 dark:bg-orange-900/50"
                              : "border-orange-300 bg-orange-100 dark:border-orange-700 dark:bg-orange-900/40"
                          )}
                        >
                          {flowCtaPreparing === status ? (
                            <Loader2 className="h-5 w-5 animate-spin text-orange-700 dark:text-orange-200" aria-hidden />
                          ) : (
                            <Sparkles className="h-5 w-5 text-orange-700 dark:text-orange-200" />
                          )}
                        </span>
                        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          {flowCtaPreparing === status
                            ? "Preparing Flow"
                            : status === "pending"
                              ? "Continue Onboarding"
                              : "Start Onboarding"}
                        </span>
                      </button>
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">No available flows right now.</p>
                  )}
                </div>

                <div className="mt-12">
                  <h3 className="text-2xl font-medium text-zinc-900 dark:text-zinc-100">Completed Flows</h3>
                  {status === "completed" ? (
                    <div className="mt-4">
                      <button
                        type="button"
                        disabled={flowCtaDisabled}
                        onClick={() => triggerOnboardingFlow("completed")}
                        className={cn(
                          "flex w-48 flex-col items-start gap-2 rounded-xl border p-3 text-left transition-colors disabled:opacity-60",
                          flowCtaPreparing === "completed"
                            ? "border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/40"
                            : "border-zinc-300 bg-zinc-50 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800",
                          flowCtaDisabled && flowCtaPreparing !== "completed" && "pointer-events-none opacity-50"
                        )}
                        aria-busy={flowCtaPreparing === "completed"}
                      >
                        <span
                          className={cn(
                            "inline-flex h-10 w-10 items-center justify-center rounded-lg border",
                            flowCtaPreparing === "completed"
                              ? "border-emerald-400 bg-emerald-100 dark:border-emerald-600 dark:bg-emerald-900/50"
                              : "border-emerald-300 bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-900/40"
                          )}
                        >
                          {flowCtaPreparing === "completed" ? (
                            <Loader2 className="h-5 w-5 animate-spin text-emerald-700 dark:text-emerald-200" aria-hidden />
                          ) : (
                            <Sparkles className="h-5 w-5 text-emerald-700 dark:text-emerald-200" />
                          )}
                        </span>
                        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          {flowCtaPreparing === "completed" ? "Preparing Flow" : "Onboarding"}
                        </span>
                      </button>
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">No completed flows yet.</p>
                  )}
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
