"use client";

import { useCallback, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  listActiveOnboardingFlowsV2,
  listCompletedOnboardingFlowsV2,
} from "@/lib/agent-flow-v2";
import {
  SAGE_MOBILE_MODE_PREFERENCE_EVENT,
  SAGE_OPEN_ONBOARDING_FLOW_EVENT,
  setSageMobileUserHoldOpen,
} from "@/components/dashboard/SageWindow";

type FlowDrawerStatus = "available" | "pending" | "completed";

export default function DashboardFlowPullDrawer() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<FlowDrawerStatus>("available");
  const [pendingFlowId, setPendingFlowId] = useState<string | null>(null);

  const refreshFlowState = useCallback(async () => {
    try {
      const flows = await listActiveOnboardingFlowsV2();
      const onboarding = flows.find(
        (f) => (f.flow_instance.flow_type ?? "").trim().toUpperCase() === "ONBOARDING"
      );
      if (onboarding) {
        setStatus("pending");
        setPendingFlowId(onboarding.flow_instance.id);
        return;
      }
    } catch {
      // continue: completed lookup can still provide best-effort state
    }

    try {
      const completed = await listCompletedOnboardingFlowsV2();
      const onboardingCompleted = completed.some(
        (f) => (f.flow_instance.flow_type ?? "").trim().toUpperCase() === "ONBOARDING"
      );
      setPendingFlowId(null);
      setStatus(onboardingCompleted ? "completed" : "available");
      return;
    } catch {
      // fall through
    }

    setPendingFlowId(null);
    setStatus("available");
  }, []);

  const pullLabel = useMemo(() => {
    if (status === "available") return "Onboarding Flow Available";
    return "Open Flow Panel";
  }, [status]);

  const isHighlighted = status === "available";

  const triggerOnboardingFlow = () => {
    setOpen(false);
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
            resumeFlowInstanceId: status === "pending" ? pendingFlowId : null,
            forceStart: status === "available",
          },
        })
      );
    }, 0);
  };

  return (
    <>
      <div className="relative z-40 flex justify-center border-b border-orange-100 bg-white/80 px-4 py-2 dark:border-zinc-800 dark:bg-zinc-900/80">
        <button
          type="button"
          onClick={async () => {
            await refreshFlowState();
            setOpen(true);
          }}
          className={cn(
            "rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors",
            isHighlighted
              ? "border-orange-300 bg-orange-100 text-orange-900 motion-safe:animate-pulse dark:border-orange-700 dark:bg-orange-900/40 dark:text-orange-100"
              : "border-zinc-300 bg-zinc-100 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
          )}
        >
          {pullLabel}
        </button>
      </div>

      {open ? (
        <div className="fixed inset-0 z-[70] bg-white dark:bg-zinc-950">
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
                    onClick={triggerOnboardingFlow}
                    className="flex w-40 flex-col items-start gap-2 rounded-xl border border-zinc-300 bg-white p-3 text-left transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                  >
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-orange-300 bg-orange-100 dark:border-orange-700 dark:bg-orange-900/40">
                      <Sparkles className="h-5 w-5 text-orange-700 dark:text-orange-200" />
                    </span>
                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {status === "pending" ? "Resume Onboarding" : "Start Onboarding"}
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
                  <div className="flex w-40 flex-col items-start gap-2 rounded-xl border border-zinc-300 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-900">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-emerald-300 bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-900/40">
                      <Sparkles className="h-5 w-5 text-emerald-700 dark:text-emerald-200" />
                    </span>
                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Onboarding</span>
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">No completed flows yet.</p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
