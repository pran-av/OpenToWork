"use client";

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  forwardRef,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  OnboardingStatusResponse,
  OnboardingUiAction,
  PublicUsersReadStatus,
} from "@/lib/agent-onboarding-types";

type ChatMessage = { role: "agent" | "user"; text: string };

type OnboardingClientPayload = {
  conversation_id?: string;
  agent_message?: string;
  message?: string;
  status?: string;
  next_step?: string | null;
  current_step?: string | null;
  completed_steps?: string[];
  pending_steps?: string[];
  progress_percent?: number;
  profile_created?: boolean | null;
  ui_actions?: OnboardingUiAction[] | null;
  step_id?: string | null;
  public_users_read?: PublicUsersReadStatus | null;
};

function getPrimaryAgentText(data: { agent_message?: string; message?: string }): string {
  if (typeof data.agent_message === "string" && data.agent_message) return data.agent_message;
  if (typeof data.message === "string" && data.message) return data.message;
  return "";
}

/** v0.2.2 server target IDs -> in-app routes (see api_contracts/agent-serviceapi-v0.2.2.md). */
const ONBOARDING_TARGET_HREF: Record<string, string> = {
  "profile.user_first_name.edit_cta": "/dashboard/profile#first_name",
  "profile.resume.upload_cta": "/dashboard/profile#resumes",
  "profile.linkedin.connect_cta": "/dashboard/profile",
  "nav.campaigns_dashboard": "/dashboard/projects",
};

function targetToHref(target: string): string | null {
  return ONBOARDING_TARGET_HREF[target] ?? null;
}

function getDetailMessage(data: unknown): string {
  if (data && typeof data === "object" && "detail" in data) {
    const d = (data as { detail?: string | unknown[] }).detail;
    if (typeof d === "string") return d;
    if (Array.isArray(d) && d.length > 0 && typeof d[0] === "object" && d[0] !== null && "msg" in d[0]) {
      return String((d[0] as { msg: string }).msg);
    }
  }
  if (data && typeof data === "object" && "error" in data) {
    const e = (data as { error?: string }).error;
    if (typeof e === "string") return e;
  }
  return "Something went wrong";
}

const SAGE_SESSION_KEY = "opentowork-sage-onboarding-v1";

/** Persists the Sage client state so theme toggles and remounts do not start a new conversation. */
type SagePersistedSession = {
  v: 1;
  conversationId: string;
  messages: ChatMessage[];
  status: string | null;
  nextStep: string | null;
  currentStep: string | null;
  progressPercent: number;
  uiActions: OnboardingUiAction[] | null;
  stepId: string | null;
  publicUsersRead: PublicUsersReadStatus | null;
  ready: boolean;
  expanded: boolean;
  skipped: boolean;
};

export interface SageWindowProps {
  /** Fires when the full Sage layer (blur + active conversation) should show — desktop only. */
  onSageLayerChange?: (isLayerActive: boolean) => void;
  className?: string;
}

export type SageWindowHandle = {
  /** Same as the in-panel “Skip onboarding” control (pauses and collapses the thread UI). */
  skip: () => void;
};

export const SageWindow = forwardRef<SageWindowHandle, SageWindowProps>(function SageWindow(
  { onSageLayerChange, className: classNameProp },
  ref
) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [nextStep, setNextStep] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [isDesktop, setIsDesktop] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [uiActions, setUiActions] = useState<OnboardingUiAction[] | null>(null);
  const [stepId, setStepId] = useState<string | null>(null);
  const [publicUsersRead, setPublicUsersRead] = useState<PublicUsersReadStatus | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const startOnboardingInFlight = useRef(false);
  const startOnboardingRef = useRef<() => Promise<void>>(async () => {});

  const applyOnboardingState = useCallback((data: OnboardingClientPayload, keepMessages: boolean) => {
    setStatus(data.status ?? null);
    setNextStep(data.next_step ?? null);
    setCurrentStep(data.current_step ?? null);
    setProgressPercent(Math.max(0, Math.min(100, data.progress_percent ?? 0)));
    setUiActions(data.ui_actions ?? null);
    setStepId(data.step_id ?? null);
    if (data.public_users_read !== undefined) {
      setPublicUsersRead(data.public_users_read);
    }
    if (!keepMessages) {
      const text = getPrimaryAgentText(data);
      if (text) setMessages([{ role: "agent", text }]);
    }
  }, []);

  const skipOnboarding = useCallback(() => {
    setSkipped(true);
    setExpanded(false);
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      skip: skipOnboarding,
    }),
    [skipOnboarding]
  );

  const startOnboarding = useCallback(async () => {
    if (startOnboardingInFlight.current) return;
    startOnboardingInFlight.current = true;
    try {
      try {
        sessionStorage.removeItem(SAGE_SESSION_KEY);
      } catch {
        // ignore
      }
      setLoading(true);
      setReady(false);
      setExpanded(false);
      setError(null);
      setInput("");
      setPublicUsersRead(null);
      try {
        const res = await fetch("/api/agent/onboarding/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        });
        const data = (await res.json()) as OnboardingClientPayload;
        if (!res.ok) {
          setError(getDetailMessage(data));
          return;
        }
        if (data.conversation_id && getPrimaryAgentText(data)) {
          setConversationId(data.conversation_id);
          applyOnboardingState(data, false);
          setReady(true);
          setExpanded(true);
          setSkipped(false);
        } else {
          setError("Unexpected response from onboarding start");
        }
      } catch {
        setError("Network error starting onboarding");
      } finally {
        setLoading(false);
      }
    } finally {
      startOnboardingInFlight.current = false;
    }
  }, [applyOnboardingState]);

  startOnboardingRef.current = startOnboarding;

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  /** One-shot bootstrap: restore from session, or only then POST /start. Does not re-run on callback identity. */
  useEffect(() => {
    if (!isDesktop) return;
    let cancelled = false;
    const run = async () => {
      try {
        const raw = sessionStorage.getItem(SAGE_SESSION_KEY);
        if (raw) {
          const snap = JSON.parse(raw) as SagePersistedSession;
          if (
            snap.v === 1 &&
            typeof snap.conversationId === "string" &&
            Array.isArray(snap.messages) &&
            snap.conversationId.length > 0
          ) {
            if (cancelled) return;
            setConversationId(snap.conversationId);
            setMessages(snap.messages);
            setStatus(snap.status);
            setNextStep(snap.nextStep);
            setCurrentStep(snap.currentStep);
            setProgressPercent(snap.progressPercent);
            setUiActions(snap.uiActions);
            setStepId(snap.stepId);
            setPublicUsersRead(snap.publicUsersRead ?? null);
            setReady(snap.ready);
            setExpanded(snap.expanded);
            setSkipped(snap.skipped);
            setError(null);
            setInput("");
            setLoading(false);
            return;
          }
        }
      } catch {
        try {
          sessionStorage.removeItem(SAGE_SESSION_KEY);
        } catch {
          // ignore
        }
      }
      if (cancelled) return;
      await startOnboardingRef.current();
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [isDesktop]);

  useEffect(() => {
    if (typeof window === "undefined" || !conversationId) return;
    const snap: SagePersistedSession = {
      v: 1,
      conversationId,
      messages,
      status,
      nextStep,
      currentStep,
      progressPercent,
      uiActions,
      stepId,
      publicUsersRead,
      ready,
      expanded,
      skipped,
    };
    try {
      sessionStorage.setItem(SAGE_SESSION_KEY, JSON.stringify(snap));
    } catch {
      // ignore storage quota / private mode
    }
  }, [
    conversationId,
    messages,
    status,
    nextStep,
    currentStep,
    progressPercent,
    uiActions,
    stepId,
    publicUsersRead,
    ready,
    expanded,
    skipped,
  ]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, expanded]);

  const layerActive = isDesktop && ready && expanded && !loading;
  useEffect(() => {
    onSageLayerChange?.(layerActive);
  }, [onSageLayerChange, layerActive]);

  useEffect(() => {
    if (!isDesktop || !conversationId || !expanded || skipped) return;
    const sync = async () => {
      try {
        const res = await fetch(`/api/agent/onboarding/${conversationId}/status`);
        if (!res.ok) return;
        const data = (await res.json()) as OnboardingStatusResponse;
        setStatus(data.status);
        setNextStep(data.next_step);
        setCurrentStep(data.current_step ?? null);
        setProgressPercent(Math.max(0, Math.min(100, data.progress_percent ?? 0)));
        setUiActions(data.ui_actions ?? null);
        setStepId(data.step_id ?? null);
        if (data.public_users_read !== undefined) {
          setPublicUsersRead(data.public_users_read);
        }
      } catch {
        // ignore background sync errors
      }
    };
    void sync();
    const t = setInterval(() => void sync(), 20000);
    return () => clearInterval(t);
  }, [isDesktop, conversationId, expanded, skipped]);

  const progressLabel = useMemo(() => {
    if (!ready) return "Preparing onboarding";
    if (status === "completed") return "Onboarding complete";
    if (currentStep) return `Current: ${currentStep}`;
    if (nextStep) return `Next: ${nextStep}`;
    return "Onboarding in progress";
  }, [currentStep, nextStep, ready, status]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || !conversationId || sending || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", text }]);
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/agent/onboarding/${conversationId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_message: text }),
      });
      const data = (await res.json()) as OnboardingClientPayload;
      if (!res.ok) {
        setError(getDetailMessage(data));
        return;
      }
      const reply = getPrimaryAgentText(data);
      if (reply) {
        setMessages((prev) => [...prev, { role: "agent", text: reply }]);
      }
      applyOnboardingState(data, true);
    } catch {
      setError("Network error sending message");
    } finally {
      setSending(false);
    }
  }, [applyOnboardingState, conversationId, input, loading, sending]);

  return (
    <section aria-label="Sage window" className={cn("flex h-full min-h-0 w-full min-w-0 flex-col", classNameProp)}>
      <div
        className={cn(
          "flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-orange-50/80 transition-all duration-500 dark:bg-orange-950/30 lg:bg-orange-50 dark:lg:bg-zinc-950",
          expanded ? "lg:max-h-full" : "max-h-16"
        )}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            {loading ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-orange-600 dark:text-orange-300" />
            ) : (
              <Sparkles className="h-4 w-4 shrink-0 text-orange-600 dark:text-orange-300" />
            )}
            <p className="truncate text-sm font-medium text-orange-900 dark:text-orange-200">
              {loading
                ? "Sage is fetching your details to personalize onboarding..."
                : skipped
                  ? "Onboarding paused. Restart when you're ready."
                  : progressLabel}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!loading && skipped && (
              <button
                type="button"
                onClick={() => void startOnboarding()}
                className="rounded-md bg-orange-500 px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-orange-600"
              >
                Restart onboarding
              </button>
            )}
            {!loading && ready && !skipped && (
              <button
                type="button"
                onClick={skipOnboarding}
                className="text-xs font-medium text-orange-800 underline-offset-2 hover:underline dark:text-orange-200"
              >
                Skip onboarding
              </button>
            )}
          </div>
        </div>

        <div className="border-t border-orange-200/80 px-4 py-2 text-xs text-orange-800 dark:border-orange-800 dark:text-orange-200">
          Progress: {progressPercent}%
          {status ? <span className="ml-2">Status: {status}</span> : null}
          {nextStep ? <span className="ml-2">Next: {nextStep}</span> : null}
          {stepId ? <span className="ml-2 font-mono text-[0.7rem] opacity-80">Step: {stepId}</span> : null}
        </div>

        {expanded && !loading && !skipped && publicUsersRead && publicUsersRead.ok === false && (
          <div
            className="border-t border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
            role="status"
          >
            <p className="font-medium">We couldn’t load your account profile for this step.</p>
            {publicUsersRead.error ? (
              <p className="mt-1 text-amber-900/90 dark:text-amber-200/90">{publicUsersRead.error}</p>
            ) : null}
            <p className="mt-1 text-amber-900/80 dark:text-amber-200/80">
              Open Profile or use the in-app links below to continue.
            </p>
          </div>
        )}

        {expanded && !loading && !skipped && uiActions && uiActions.length > 0 && (
          <div className="space-y-1.5 border-t border-orange-200/60 bg-orange-50/50 px-4 py-2 dark:border-orange-800/50 dark:bg-orange-950/20">
            <p className="text-xs font-medium text-orange-900 dark:text-orange-200">In the app</p>
            <ul className="flex flex-col gap-1.5" aria-label="Sage UI actions">
              {uiActions.map((a, i) => {
                const href = targetToHref(a.target);
                return (
                  <li key={`${a.target}-${i}`}>
                    {href ? (
                      <Link
                        href={href}
                        className="text-xs text-orange-800 underline decoration-orange-300 underline-offset-2 hover:text-orange-950 dark:text-orange-100 dark:decoration-orange-700"
                      >
                        {a.tooltip}
                      </Link>
                    ) : (
                      <span className="text-xs text-orange-800 dark:text-orange-200" title={a.target}>
                        {a.tooltip}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {expanded && !loading && !skipped && (
          <div className="flex min-h-0 flex-1 flex-col border-t border-orange-200 bg-orange-50/95 dark:border-orange-900/50 dark:bg-zinc-950/95">
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
              {messages.map((m, i) => (
                <div
                  key={`${m.role}-${i}`}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={
                      m.role === "agent"
                        ? "max-w-[80%] rounded-xl bg-orange-100 px-3 py-2 text-sm text-zinc-900 dark:bg-orange-900/40 dark:text-zinc-100"
                        : "max-w-[80%] rounded-xl bg-zinc-200 px-3 py-2 text-sm text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100"
                    }
                  >
                    {m.text}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {error && (
              <div className="border-t border-red-100 bg-red-50 px-4 py-2 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
                {error}
              </div>
            )}

            <div className="border-t border-zinc-200 p-4 dark:border-zinc-800">
              <div className="flex items-center gap-2 rounded-full border border-zinc-300 bg-zinc-50 px-3 py-1.5 dark:border-zinc-600 dark:bg-zinc-800">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void handleSend();
                    }
                  }}
                  placeholder="Reply to Sage..."
                  disabled={loading || !conversationId || sending}
                  className="min-w-0 flex-1 bg-transparent text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-zinc-100 dark:placeholder:text-zinc-500"
                  aria-label="Message"
                />
                <button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={loading || !conversationId || sending || !input.trim()}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-600 transition-colors hover:bg-zinc-200 disabled:opacity-40 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  aria-label="Send"
                >
                  <span aria-hidden className="text-lg leading-none">
                    →
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
});
