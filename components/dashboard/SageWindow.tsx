"use client";

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  forwardRef,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Check, Circle, Loader2, Sparkles } from "lucide-react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import type {
  FlowEnvelopeResponse,
  FlowStep,
  FlowUiAction,
} from "@/lib/agent-onboarding-types";
import {
  getFlowV2,
  listActiveOnboardingFlowsV2,
  startOnboardingFlowV2,
} from "@/lib/agent-flow-v2";
import {
  buildOnboardingTaskHref,
  getResolvedOnboardingTaskHref,
  onboardingUiActionOrder,
} from "@/lib/sage-onboarding-nav";

type ChatMessage = { role: "agent" | "user"; text: string };

const SAGE_MARKDOWN_COMPONENTS: Components = {
  p: ({ children }) => <p className="mb-2.5 last:mb-0 first:mt-0 leading-relaxed">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-zinc-900 dark:text-zinc-100">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  ul: ({ children }) => (
    <ul className="mb-0 mt-2 list-disc space-y-1.5 pl-4 [li]:marker:text-orange-500/80 first:mt-0 last:mb-0">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-0 mt-2 list-decimal space-y-1.5 pl-4 first:mt-0 last:mb-0">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="my-0.5 leading-relaxed [&>p]:mb-0 [&>p]:mt-0 [&>p:only-child]:mb-0">{children}</li>
  ),
  a: ({ children, href }) => {
    if (!href) return <span className="text-inherit">{children}</span>;
    return (
      <a
        href={href}
        className="font-medium text-orange-800 underline decoration-orange-400 underline-offset-2 hover:text-orange-950 dark:text-orange-200 dark:decoration-orange-600"
        target={href.startsWith("/") ? undefined : "_blank"}
        rel={href.startsWith("/") ? undefined : "noreferrer"}
      >
        {children}
      </a>
    );
  },
  code: ({ className, children }) => {
    const isBlock = Boolean(className?.includes("language-"));
    if (isBlock) {
      return <code className={cn("block w-full text-xs", className)}>{children}</code>;
    }
    return (
      <code className="rounded bg-orange-200/50 px-1 py-0.5 text-[0.9em] dark:bg-zinc-800/80">{children}</code>
    );
  },
  pre: ({ children }) => (
    <pre className="my-2 w-full max-w-full overflow-x-auto rounded-md bg-zinc-900/10 p-2.5 first:mt-0 dark:bg-zinc-950/50">
      {children}
    </pre>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-orange-300/80 pl-3 text-inherit first:mt-0 dark:border-orange-600/50">
      {children}
    </blockquote>
  ),
  h1: ({ children }) => <h3 className="mb-1.5 mt-2.5 text-sm font-bold first:mt-0">{children}</h3>,
  h2: ({ children }) => <h3 className="mb-1.5 mt-2.5 text-sm font-bold first:mt-0">{children}</h3>,
  h3: ({ children }) => <h3 className="mb-1.5 mt-2 text-sm font-bold first:mt-0">{children}</h3>,
  hr: () => <hr className="my-3 border-orange-200/50 dark:border-orange-800/50" />,
};

const ONBOARDING_TARGET_DEFAULT_LABEL: Record<string, string> = {
  "profile.user_name.edit": "Update your first and last name in profile.",
  "profile.resume.upload_cta": "Upload your resume in profile.",
  "profile.linkedin.connect_cta": "Finish your LinkedIn connection in profile settings.",
  "nav.campaigns_dashboard": "Open Campaigns to build pitches from your experiences.",
};

/**
 * Maps fixed `ui_actions[].target` IDs to onboarding `completed_steps` keys (agent API v0.2.3).
 * @see api_contracts/agent-serviceapi-v0.2.3.md
 */
const ONBOARDING_TARGET_TO_COMPLETION_STEP: Record<string, string> = {
  "profile.user_name.edit": "profile.user_name.edit",
  "profile.resume.upload_cta": "resume_prompt",
  "profile.linkedin.connect_cta": "linkedin_connect",
  "nav.campaigns_dashboard": "introduce_app_features",
};

function onboardingStepForUiTarget(target: string): string | null {
  return ONBOARDING_TARGET_TO_COMPLETION_STEP[target] ?? null;
}

function isUiActionComplete(
  target: string,
  completedSteps: string[],
  status: string | null
): boolean {
  if (status === "completed" || status === "FLOW_COMPLETED") return true;
  const step = onboardingStepForUiTarget(target);
  if (step) return completedSteps.includes(step);
  return false;
}

function uiActionDisplayLabel(tooltip: string): string {
  return tooltip
    .replace(/^\s*Client:\s*/i, "")
    .replace(/^\s*Internal:\s*/i, "")
    .trim();
}

function defaultLabelForTarget(target: string): string {
  return ONBOARDING_TARGET_DEFAULT_LABEL[target] ?? "Complete this onboarding step.";
}

/** Short hub line — never the full intro paragraph. */
const DEFAULT_SAGE_FLOW_LABEL = "Onboarding";

/** `flow_type` from API (e.g. `onboarding`) → user-facing name for the hub line. */
function formatFlowTypeLabel(raw: string | null | undefined): string {
  if (raw == null) return DEFAULT_SAGE_FLOW_LABEL;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return DEFAULT_SAGE_FLOW_LABEL;
  const lower = trimmed.toLowerCase();
  return `${lower.charAt(0).toUpperCase()}${lower.slice(1)}`;
}

function oneLinePendingFromAgentText(text: string, max = 88): string {
  const noMd = text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  const bySentence = noMd.split(/(?<=[.!?])\s+/);
  const first = (bySentence[0] ?? noMd).trim();
  if (first.length <= max) return first;
  return `${first.slice(0, max - 1).trim()}…`;
}

function sageMessageForServerStep(stepKey: string): string | null {
  if (stepKey === "introduce_sage_objectives") {
    return "Let’s align on your goals first so I can tailor every next step to your target role.";
  }
  if (stepKey === "introduce_app_brief") {
    return "Quick app brief: I will guide you through experience setup, campaign launch, and profile polish end-to-end.";
  }
  return null;
}

const SAGE_SESSION_KEY = "opentowork-sage-onboarding-v1";
const SAGE_TASK_NAV_CONTEXT_KEY = "opentowork-sage-task-nav-v1";
const AUTH_LOAD_ONBOARDING_KEY = "opentowork-sage-authed-load-v1";

/** Persists the Sage client state so theme toggles and remounts do not start a new conversation. */
type SagePersistedSession = {
  v: 1;
  conversationId: string;
  messages: ChatMessage[];
  status: string | null;
  nextStep: string | null;
  currentStep: string | null;
  progressPercent: number;
  uiActions: FlowUiAction[] | null;
  flowUiActions: FlowUiAction[] | null;
  flowSteps: FlowStep[];
  stepId: string | null;
  flowInstanceId: string | null;
  ready: boolean;
  expanded: boolean;
  skipped: boolean;
  /** `flow_type` from agent (e.g. `onboarding`); when absent, UI defaults to "Onboarding". */
  flowType?: string | null;
  completedSteps?: string[];
  todoByTarget?: Record<string, { label: string; order: number }>;
};

type SageTaskNavContext = {
  target: string;
  tooltip: string;
  message?: string;
  createdAt: number;
  flowInstanceId: string | null;
  stepId: string | null;
};

export interface SageWindowProps {
  /** Fires when the full Sage layer (blur + active conversation) should show — desktop only. */
  onSageLayerChange?: (isLayerActive: boolean) => void;
  /**
   * When `false`, the 50% right rail is collapsed (e.g. paused-onboarding “hub” with FAB in the corner only).
   * When `true`, the fixed rail is shown for loading / active session UIs.
   */
  onRightRailChange?: (showRightRail: boolean) => void;
  className?: string;
  /** Measured height of the Studio header chrome, for positioning the desktop loading banner. */
  headerOffsetPx: number;
}

export type SageWindowHandle = {
  /** Same as the in-panel “Skip onboarding” control (pauses and collapses the thread UI). */
  skip: () => void;
  /** Re-opens the Sage panel on the active onboarding conversation (not the conversation picker). */
  resume: () => void;
};

/** Pixels under the header before the banner (breathing room). */
const BANNER_GAP_BELOW_HEADER_PX = 8;
/** Reserves the typical band used by `fixed top-4` toasts (see dashboard pages) so the Sage banner does not sit under them. */
const TOAST_STACK_RESERVE_PX = 72;
const TODO_COLLAPSE_ITEM_LIMIT = 3;

export const SageWindow = forwardRef<SageWindowHandle, SageWindowProps>(function SageWindow(
  { onSageLayerChange, onRightRailChange, className: classNameProp, headerOffsetPx },
  ref
) {
  const router = useRouter();
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
  const [uiActions, setUiActions] = useState<FlowUiAction[] | null>(null);
  const [flowUiActions, setFlowUiActions] = useState<FlowUiAction[] | null>(null);
  const [flowSteps, setFlowSteps] = useState<FlowStep[]>([]);
  const [stepId, setStepId] = useState<string | null>(null);
  const [flowInstanceId, setFlowInstanceId] = useState<string | null>(null);
  const [flowType, setFlowType] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [todoExpanded, setTodoExpanded] = useState(false);
  const [todoByTarget, setTodoByTarget] = useState<Record<string, { label: string; order: number }>>({});
  const [showConversationList, setShowConversationList] = useState(false);
  const [activeConversations, setActiveConversations] = useState<FlowEnvelopeResponse[]>([]);
  const [activeConversationsLoading, setActiveConversationsLoading] = useState(false);
  const [activeConversationsError, setActiveConversationsError] = useState<string | null>(null);
  const [selectingConversationId, setSelectingConversationId] = useState<string | null>(null);
  const lastAnnouncedServerStepRef = useRef<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const startOnboardingInFlight = useRef(false);
  const startOnboardingRef = useRef<() => Promise<void>>(async () => {});
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  const applyFlowState = useCallback((flow: FlowEnvelopeResponse, keepMessages: boolean) => {
    setFlowInstanceId(flow.flow_instance.id);
    setStatus(flow.flow_instance.state);
    setFlowType(flow.flow_instance.flow_type ?? null);
    setFlowUiActions(flow.ui_actions ?? []);
    setFlowSteps(flow.steps ?? []);
    setProgressPercent(Math.max(0, Math.min(100, flow.progress?.percent ?? 0)));

    const completed = new Set<string>();
    (flow.steps ?? []).forEach((step) => {
      if (step.state === "STEP_DONE" || step.state === "STEP_SKIPPED") completed.add(step.step_key);
    });
    setCompletedSteps(Array.from(completed));

    const orderedUi = (flow.ui_actions ?? []).filter((a) => a.state === "STEP_ISSUED");
    setUiActions(
      orderedUi.map((a) => ({
        ...a,
        tooltip: a.tooltip || a.message || "Complete this onboarding task",
      }))
    );
    setStepId(orderedUi[0]?.target ?? null);

    const firstPending = (flow.steps ?? []).find((s) => s.state === "STEP_ISSUED");
    setCurrentStep(firstPending?.step_key ?? null);
    setNextStep(firstPending?.step_key ?? null);

    const serverPendingStep =
      firstPending && firstPending.actor_type === "SERVER" ? firstPending.step_key : null;
    const serverPendingMessage = serverPendingStep ? sageMessageForServerStep(serverPendingStep) : null;

    if (!keepMessages) {
      const line = serverPendingMessage
        ? serverPendingMessage
        : firstPending
        ? `Let’s continue onboarding. Next step: ${firstPending.step_key.replaceAll("_", " ")}.`
        : "Onboarding is ready. Follow the highlighted tasks.";
      setMessages([{ role: "agent", text: line }]);
      lastAnnouncedServerStepRef.current = serverPendingStep;
    } else if (
      serverPendingStep &&
      serverPendingMessage &&
      lastAnnouncedServerStepRef.current !== serverPendingStep
    ) {
      setMessages((prev) => [...prev, { role: "agent", text: serverPendingMessage }]);
      lastAnnouncedServerStepRef.current = serverPendingStep;
    } else if (!serverPendingStep) {
      lastAnnouncedServerStepRef.current = null;
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
      resume: () => {
        setSkipped(false);
        setExpanded(true);
        setShowConversationList(false);
      },
    }),
    [skipOnboarding]
  );

  const fetchActiveConversations = useCallback(async () => {
    setActiveConversationsLoading(true);
    setActiveConversationsError(null);
    try {
      const flows = await listActiveOnboardingFlowsV2();
      setActiveConversations(flows);
    } catch {
      setActiveConversations([]);
      setActiveConversationsError("Failed to load active conversations.");
    } finally {
      setActiveConversationsLoading(false);
    }
  }, []);

  const startOnboarding = useCallback(async (resumeFlowInstanceId?: string | null) => {
    if (startOnboardingInFlight.current) return;
    startOnboardingInFlight.current = true;
    try {
      try {
        if (!resumeFlowInstanceId) sessionStorage.removeItem(SAGE_SESSION_KEY);
      } catch {
        // ignore
      }
      setLoading(true);
      setReady(false);
      setExpanded(false);
      setShowConversationList(false);
      setError(null);
      setInput("");
      setFlowType(null);
      setCompletedSteps([]);
      setTodoByTarget({});
      try {
        const flow = resumeFlowInstanceId
          ? await getFlowV2(resumeFlowInstanceId)
          : await startOnboardingFlowV2();
        setConversationId(flow.flow_instance.id);
        applyFlowState(flow, false);
        setReady(true);
        setExpanded(true);
        setSkipped(false);
      } catch {
        setError("Network error starting onboarding");
      } finally {
        setLoading(false);
      }
    } finally {
      startOnboardingInFlight.current = false;
    }
  }, [applyFlowState]);

  startOnboardingRef.current = startOnboarding;

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  /** One-shot bootstrap: restore from sessionStorage, otherwise show conversation list. */
  useEffect(() => {
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
            setFlowUiActions(snap.flowUiActions ?? []);
            setFlowSteps(snap.flowSteps ?? []);
            setStepId(snap.stepId);
            setFlowInstanceId(snap.flowInstanceId ?? snap.conversationId);
            setReady(snap.ready);
            setExpanded(snap.expanded);
            setSkipped(snap.skipped);
            setFlowType(snap.flowType ?? null);
            setCompletedSteps(snap.completedSteps ?? []);
            setTodoByTarget(snap.todoByTarget ?? {});
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
      setReady(true);
      setExpanded(true);
      setSkipped(false);
      try {
        const flows = await listActiveOnboardingFlowsV2();
        if (cancelled) return;
        if (flows.length > 0) {
          const first = flows[0];
          setConversationId(first.flow_instance.id);
          applyFlowState(first, false);
          return;
        }
      } catch {
        // ignored, fallback to start
      }
      try {
        const bootKey = AUTH_LOAD_ONBOARDING_KEY;
        if (!sessionStorage.getItem(bootKey)) {
          sessionStorage.setItem(bootKey, "1");
          await startOnboardingRef.current();
          return;
        }
      } catch {
        // ignore
      }
      setShowConversationList(true);
      await fetchActiveConversations();
    };
    void run();
    return () => {
      cancelled = true;
    };
    /* Intentionally omit `isDesktop`: bootstrap must run on mobile/tablet; including it re-ran the flow after the media query flip and duplicated work on desktop. */
  }, [applyFlowState, fetchActiveConversations]);

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
      flowUiActions,
      flowSteps,
      stepId,
      flowInstanceId,
      ready,
      expanded,
      skipped,
      flowType,
      completedSteps,
      todoByTarget,
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
    flowUiActions,
    flowSteps,
    stepId,
    flowInstanceId,
    ready,
    expanded,
    skipped,
    flowType,
    completedSteps,
    todoByTarget,
  ]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, expanded]);

  const layerActive = isDesktop && ready && expanded && !loading;
  useEffect(() => {
    onSageLayerChange?.(layerActive);
  }, [onSageLayerChange, layerActive]);

  const refreshConversationStatus = useCallback(async () => {
    const id = flowInstanceId ?? conversationId;
    if (!id) return;
    try {
      const flow = await getFlowV2(id);
      applyFlowState(flow, true);
    } catch {
      // ignore background sync errors
    }
  }, [applyFlowState, conversationId, flowInstanceId]);

  useEffect(() => {
    if (!isDesktop || !conversationId || !expanded || skipped || showConversationList) return;
    void refreshConversationStatus();
    const t = setInterval(() => void refreshConversationStatus(), 20000);
    return () => clearInterval(t);
  }, [isDesktop, conversationId, expanded, skipped, showConversationList, refreshConversationStatus]);

  useEffect(() => {
    const onUiActionAck = () => {
      void refreshConversationStatus();
    };
    window.addEventListener("sage-ui-action-acknowledged", onUiActionAck);
    return () => window.removeEventListener("sage-ui-action-acknowledged", onUiActionAck);
  }, [refreshConversationStatus]);

  const flowLabel = formatFlowTypeLabel(flowType);
  const isOnboardingFlow = (flowType ?? "").trim().toUpperCase() === "ONBOARDING";
  const onboardingCtaLabel = useMemo(() => {
    if ((flowType ?? "").trim().toUpperCase() !== "ONBOARDING") return "Start Onboarding";
    const hasPartial = (flowUiActions ?? []).some(
      (a) => a.state === "STEP_DONE" || a.state === "STEP_SKIPPED"
    );
    return hasPartial ? "Resume Onboarding" : "Start Onboarding";
  }, [flowType, flowUiActions]);

  const progressLabel = useMemo(() => {
    if (showConversationList) return "Select an active conversation";
    if (!ready) return `Preparing ${flowLabel.toLowerCase()}`;
    if (status === "completed" || status === "FLOW_COMPLETED") return `${flowLabel} complete`;
    return flowLabel;
  }, [flowLabel, ready, showConversationList, status]);

  const sageHubPendingLine = useMemo(() => {
    if (status === "completed" || status === "FLOW_COMPLETED")
      return "Hi, I am Sage! Let me know if you need help.";
    if (currentStep) return `Finish: ${flowLabel}`;
    if (nextStep) return `Up next: ${flowLabel}`;
    if (status && status !== "completed") return `${flowLabel}: ${status}`;
    const lastAgent = [...messages].reverse().find((m) => m.role === "agent");
    const fromMsg = lastAgent?.text?.trim() ?? "";
    if (fromMsg) return oneLinePendingFromAgentText(fromMsg);
    return `Finish ${flowLabel.toLowerCase()} in Sage`;
  }, [messages, currentStep, nextStep, status, flowLabel]);

  const resumeSageFromPausedHub = useCallback(() => {
    setSkipped(false);
    setExpanded(true);
    setShowConversationList(false);
  }, []);

  const todoItems = useMemo(
    () => {
      const allTargets = new Set<string>(Object.keys(todoByTarget));
      for (const a of uiActions ?? []) allTargets.add(a.target);
      for (const step of flowSteps) {
        if (step.actor_type === "SERVER") continue;
        allTargets.add(step.step_key);
      }
      for (const [target, step] of Object.entries(ONBOARDING_TARGET_TO_COMPLETION_STEP)) {
        if (completedSteps.includes(step)) allTargets.add(target);
      }

      return Array.from(allTargets).map((target) => {
        const fromAgent = (uiActions ?? []).find((a) => a.target === target);
        const fromFlowUi = (flowUiActions ?? []).find((a) => a.target === target);
        const fromFlowStep = flowSteps.find((s) => s.step_key === target && s.actor_type !== "SERVER");
        const history = todoByTarget[target];
        const label = fromAgent
          ? uiActionDisplayLabel(fromAgent.tooltip)
          : fromFlowUi
            ? uiActionDisplayLabel(fromFlowUi.tooltip || fromFlowUi.message || "")
          : fromFlowStep
            ? fromFlowStep.step_key.replaceAll("_", " ")
            : history?.label ?? defaultLabelForTarget(target);
        const order =
          history?.order ?? (fromAgent || fromFlowUi || fromFlowStep ? Number.MAX_SAFE_INTEGER : 0);
        const uiActionDone =
          fromFlowUi?.state === "STEP_DONE" || fromFlowUi?.state === "STEP_SKIPPED";
        const done = uiActionDone
          ? true
          : fromFlowStep
            ? fromFlowStep.state === "STEP_DONE" || fromFlowStep.state === "STEP_SKIPPED"
            : isUiActionComplete(target, completedSteps, status);
        return {
          key: target,
          href: getResolvedOnboardingTaskHref(target),
          done,
          label,
          tooltip: fromAgent?.tooltip ?? fromFlowUi?.tooltip ?? label,
          message: fromAgent?.message ?? fromFlowUi?.message ?? null,
          target,
          order,
          sequence: onboardingUiActionOrder(target),
        };
      });
    },
    [completedSteps, flowSteps, flowUiActions, status, todoByTarget, uiActions]
  );

  const orderedTodoItems = useMemo(
    () =>
      [...todoItems].sort((a, b) => {
        // Pending first, completed below. Within each group, PRD sequence order.
        if (a.done !== b.done) return a.done ? 1 : -1;
        if (a.sequence !== b.sequence) return a.sequence - b.sequence;
        return b.order - a.order;
      }),
    [todoItems]
  );

  const nextPendingTodo = useMemo(() => {
    if (!isOnboardingFlow) {
      return orderedTodoItems.find((item) => !item.done && Boolean(item.href)) ?? null;
    }
    // Single CTA: follow server ISSUED queue in PRD order (not inferred rows that lack STEP_DONE tracking).
    const issued = uiActions ?? [];
    if (issued.length === 0) return null;
    const sorted = [...issued].sort(
      (a, b) => onboardingUiActionOrder(a.target) - onboardingUiActionOrder(b.target)
    );
    const first = sorted[0];
    const href = getResolvedOnboardingTaskHref(first.target);
    if (!href) return null;
    const baseLabel = uiActionDisplayLabel(
      first.tooltip || first.message || "Complete this onboarding task"
    );
    return {
      key: first.target,
      target: first.target,
      href,
      label: baseLabel || defaultLabelForTarget(first.target),
      tooltip: first.tooltip?.trim().length ? first.tooltip : baseLabel || first.target,
      message: first.message ?? null,
      done: false as const,
      order: Date.now(),
      sequence: onboardingUiActionOrder(first.target),
    };
  }, [isOnboardingFlow, orderedTodoItems, uiActions]);

  useEffect(() => {
    if (!uiActions || uiActions.length === 0) return;
    setTodoByTarget((prev) => {
      const next = { ...prev };
      uiActions.forEach((a, i) => {
        next[a.target] = {
          label: uiActionDisplayLabel(a.tooltip),
          order: Date.now() + i,
        };
      });
      return next;
    });
  }, [uiActions]);

  const shouldCollapseTodo = useMemo(
    () =>
      orderedTodoItems.length > TODO_COLLAPSE_ITEM_LIMIT ||
      orderedTodoItems.some((item) => item.label.length > 110),
    [orderedTodoItems]
  );

  const visibleTodoItems = useMemo(() => {
    if (!shouldCollapseTodo || todoExpanded) return orderedTodoItems;
    return orderedTodoItems.slice(0, TODO_COLLAPSE_ITEM_LIMIT);
  }, [shouldCollapseTodo, todoExpanded, orderedTodoItems]);

  useEffect(() => {
    // Prefetch likely destinations for smoother navigation from "Complete Task" CTAs.
    for (const item of orderedTodoItems) {
      if (!item.href || item.done) continue;
      void router.prefetch(buildOnboardingTaskHref(item.href, item.target));
    }
  }, [orderedTodoItems, router]);

  const showDesktopLoadingBanner = loading && isDesktop;
  const pausedHubDesktop = skipped && isDesktop && !loading;
  const showPausedHubAttention = status === "active" || status === "FLOW_ACTIVE";

  useLayoutEffect(() => {
    onRightRailChange?.(!pausedHubDesktop);
  }, [onRightRailChange, pausedHubDesktop]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading || sending) return;

    setSending(true);
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text }]);
    window.setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: "agent",
          text: "Onboarding V2 is currently guided through highlights and tasks. Use the To Do list actions to proceed.",
        },
      ]);
      setSending(false);
    }, 450);
  }, [input, loading, sending]);

  const handleTodoCtaClick = useCallback(
    (item: { href: string; target: string; label: string; tooltip?: string; message?: string | null }) => {
      try {
        const navContext: SageTaskNavContext = {
          target: item.target,
          tooltip: item.tooltip ?? item.label,
          message: item.message ?? undefined,
          createdAt: Date.now(),
          flowInstanceId: flowInstanceId ?? conversationId,
          stepId:
            stepId ??
            flowSteps.find((s) => s.actor_type !== "SERVER" && s.state === "STEP_ISSUED")?.step_key ??
            onboardingStepForUiTarget(item.target) ??
            null,
        };
        sessionStorage.setItem(
          SAGE_TASK_NAV_CONTEXT_KEY,
          JSON.stringify(navContext)
        );
      } catch {
        // ignore storage failures
      }
      // Collapse Sage so the destination page is fully visible for task completion.
      setSkipped(true);
      setExpanded(false);
      router.push(buildOnboardingTaskHref(item.href, item.target), { scroll: false });
    },
    [conversationId, flowInstanceId, flowSteps, router, stepId]
  );

  return (
    <section
      aria-label="Sage window"
      className={cn(
        "flex h-full min-h-0 w-full min-w-0 flex-col",
        classNameProp,
        pausedHubDesktop && "h-0 min-h-0 overflow-hidden p-0"
      )}
    >
      {portalReady &&
        pausedHubDesktop &&
        createPortal(
          <div className="pointer-events-none max-lg:hidden">
            <div className="pointer-events-auto fixed bottom-5 right-5 z-[44] flex w-[13.5rem] flex-col items-center gap-2 max-lg:hidden">
              <div
                role="status"
                className="w-full max-w-full rounded-lg border border-zinc-200/90 bg-white px-2.5 py-1.5 text-left shadow-md ring-1 ring-black/5 dark:border-zinc-600 dark:bg-zinc-900 dark:ring-white/10"
              >
                <p
                  id="sage-hub-pending-line"
                  className="text-center text-xs font-medium leading-snug text-zinc-700 dark:text-zinc-200"
                  title={sageHubPendingLine}
                >
                  {sageHubPendingLine}
                </p>
              </div>
              <div className="relative h-[4.5rem] w-[4.5rem] overflow-visible">
                {showPausedHubAttention ? (
                  <>
                    <span
                      className="absolute inset-0 -m-1 rounded-full bg-amber-400/40 blur-[3px] motion-safe:animate-pulse"
                      aria-hidden
                    />
                    <span
                      className="absolute inset-0 rounded-full border-2 border-amber-400/50 motion-safe:animate-ping"
                      aria-hidden
                    />
                  </>
                ) : null}
                <button
                  type="button"
                  onClick={resumeSageFromPausedHub}
                  className="relative z-10 flex h-[4.5rem] w-[4.5rem] items-center justify-center overflow-hidden rounded-full border-2 border-amber-300 bg-orange-50 shadow-lg transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 dark:border-amber-600/60 dark:bg-zinc-800 dark:focus:ring-amber-500"
                  title="Open Sage to continue onboarding"
                  aria-label="Open Sage to continue onboarding"
                  aria-describedby="sage-hub-pending-line"
                >
                  <Image
                    src="/sage_mascot.png"
                    alt=""
                    width={56}
                    height={70}
                    className="h-[3.5rem] w-auto object-contain object-bottom"
                  />
                  <span
                    className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-orange-50 bg-amber-500 dark:border-zinc-900 dark:bg-amber-400"
                    aria-hidden
                  />
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      {!pausedHubDesktop && showDesktopLoadingBanner ? (
        <div
          className="pointer-events-none fixed z-[45] max-lg:hidden"
          style={{
            top: headerOffsetPx + BANNER_GAP_BELOW_HEADER_PX + TOAST_STACK_RESERVE_PX,
            right: "1rem",
          }}
        >
          <div
            className="pointer-events-auto w-[min(20rem,calc(50vw-1.5rem))] max-w-md rounded-lg border border-orange-200 bg-orange-50 px-3 py-2.5 shadow-md sm:px-4 sm:py-3 dark:border-orange-800 dark:bg-orange-950/90"
            role="status"
            aria-live="polite"
            aria-atomic
          >
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600 dark:bg-orange-900/50 dark:text-orange-300">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-orange-900 dark:text-orange-100">Preparing Sage</p>
                <p className="mt-1 text-xs leading-snug text-orange-800 dark:text-orange-200/90">
                  Sage is fetching your details to personalize onboarding.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {!pausedHubDesktop && (
      <div
        className={cn(
          "flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-orange-50/80 transition-all duration-500 dark:bg-orange-950/30 lg:bg-orange-50 dark:lg:bg-zinc-950",
          /* Desktop collapsed rail stays short; mobile/tablet full-screen needs full height while loading (expanded is false). */
          expanded ? "max-h-full" : isDesktop ? "max-h-16" : "max-h-full",
          showDesktopLoadingBanner &&
            "max-h-0 min-h-0 border-0 p-0 opacity-0 [visibility:hidden] pointer-events-none"
        )}
        aria-hidden={showDesktopLoadingBanner ? true : undefined}
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
                  ? `${flowLabel} paused. Restart when you're ready.`
                  : progressLabel}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!loading && !showConversationList && (
              <button
                type="button"
                onClick={async () => {
                  setShowConversationList(true);
                  setActiveConversations([]);
                  await fetchActiveConversations();
                }}
                className="text-xs font-medium text-orange-800 underline-offset-2 hover:underline dark:text-orange-200"
              >
                Back to conversations
              </button>
            )}
            {!loading && skipped && !isDesktop && (
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
                Collapse window
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

        {expanded && !loading && !skipped && !showConversationList && orderedTodoItems.length > 0 && (
          <div className="space-y-2 border-t border-orange-200/60 bg-orange-50/50 px-4 py-2.5 dark:border-orange-800/50 dark:bg-orange-950/20">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-orange-900 dark:text-orange-200">Your To Do List</p>
              {shouldCollapseTodo ? (
                <button
                  type="button"
                  onClick={() => setTodoExpanded((prev) => !prev)}
                  className="text-[11px] font-medium text-orange-800 underline decoration-orange-300 underline-offset-2 hover:text-orange-950 dark:text-orange-200 dark:decoration-orange-700"
                  aria-expanded={todoExpanded}
                  aria-controls="sage-todo-list"
                >
                  {todoExpanded ? "Collapse" : `Expand (${orderedTodoItems.length})`}
                </button>
              ) : null}
            </div>
            <ul className="flex flex-col gap-2" role="list" aria-label="Onboarding to do list" id="sage-todo-list">
              {visibleTodoItems.map((item) => {
                return (
                  <li key={item.key} className="flex min-w-0 items-center gap-2">
                    <span
                      className="shrink-0 self-center"
                      aria-hidden
                      title={onboardingStepForUiTarget(item.target) ? undefined : item.target}
                    >
                      {item.done ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-500" strokeWidth={2.5} />
                      ) : (
                        <Circle className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" strokeWidth={2} />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center justify-between gap-2">
                        <span
                          className={cn(
                            "min-w-0 text-xs leading-snug",
                            item.done ? "text-emerald-700 line-through dark:text-emerald-400" : "text-orange-800 dark:text-orange-200/90"
                          )}
                          title={item.target}
                        >
                          {item.label}
                        </span>
                        {item.done ? (
                          <span className="shrink-0 rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 dark:border-emerald-700/70 dark:bg-emerald-900/30 dark:text-emerald-300">
                            Completed
                          </span>
                        ) : !isOnboardingFlow && item.href ? (
                          <button
                            type="button"
                            onClick={() => {
                              const href = item.href;
                              if (!href) return;
                              handleTodoCtaClick({
                                href,
                                target: item.target,
                                label: item.label,
                                tooltip: item.tooltip,
                                message: item.message,
                              });
                            }}
                            className="shrink-0 rounded-md border border-orange-300 bg-orange-100 px-2 py-1 text-[11px] font-semibold text-orange-900 transition-colors hover:bg-orange-200 dark:border-orange-700 dark:bg-orange-900/40 dark:text-orange-100"
                            aria-label={`Complete task: ${item.label}`}
                          >
                            Complete Task
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            {isOnboardingFlow ? (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    if (!nextPendingTodo?.href) return;
                    handleTodoCtaClick({
                      href: nextPendingTodo.href,
                      target: nextPendingTodo.target,
                      label: nextPendingTodo.label,
                    tooltip: nextPendingTodo.tooltip,
                    message: nextPendingTodo.message,
                    });
                  }}
                  disabled={!nextPendingTodo}
                  className="rounded-md border border-orange-300 bg-orange-100 px-3 py-1.5 text-xs font-semibold text-orange-900 transition-colors hover:bg-orange-200 disabled:cursor-not-allowed disabled:opacity-50 dark:border-orange-700 dark:bg-orange-900/40 dark:text-orange-100"
                  aria-label={
                    nextPendingTodo
                      ? `${onboardingCtaLabel}: ${nextPendingTodo.label}`
                      : "No pending onboarding tasks available"
                  }
                >
                  {onboardingCtaLabel}
                </button>
              </div>
            ) : null}
            {!todoExpanded && shouldCollapseTodo ? (
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {orderedTodoItems.length - visibleTodoItems.length} more item
                {orderedTodoItems.length - visibleTodoItems.length === 1 ? "" : "s"} hidden
              </p>
            ) : null}
          </div>
        )}

        {expanded && !loading && !skipped && showConversationList && (
          <div className="min-h-0 flex-1 border-t border-orange-200 bg-orange-50/95 p-4 dark:border-orange-900/50 dark:bg-zinc-950/95">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Active conversations</p>
              <button
                type="button"
                onClick={() => void fetchActiveConversations()}
                disabled={activeConversationsLoading}
                className="rounded-md border border-orange-300 px-2 py-1 text-xs font-medium text-orange-900 transition-colors hover:bg-orange-100 disabled:opacity-50 dark:border-orange-700 dark:text-orange-200 dark:hover:bg-orange-900/40"
              >
                Refresh
              </button>
            </div>

            {activeConversationsLoading ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading active conversations...</p>
            ) : activeConversationsError ? (
              <div className="space-y-2">
                <p className="text-sm text-red-600 dark:text-red-400">{activeConversationsError}</p>
                <button
                  type="button"
                  onClick={() => void startOnboarding()}
                  className="rounded-md bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-orange-600"
                >
                  {onboardingCtaLabel}
                </button>
              </div>
            ) : activeConversations.length === 0 ? (
              <div className="space-y-2">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">No active onboarding flows found.</p>
                <button
                  type="button"
                  onClick={() => void startOnboarding()}
                  className="rounded-md bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-orange-600"
                >
                  {onboardingCtaLabel}
                </button>
              </div>
            ) : (
              <ul className="space-y-2">
                {activeConversations.map((conversation) => (
                  <li key={conversation.flow_instance.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectingConversationId(conversation.flow_instance.id);
                        void startOnboarding(conversation.flow_instance.id).finally(() =>
                          setSelectingConversationId(null)
                        );
                      }}
                      disabled={selectingConversationId === conversation.flow_instance.id}
                      className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-left transition-colors hover:border-orange-300 hover:bg-orange-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-orange-700 dark:hover:bg-orange-900/20"
                    >
                      <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        Resume onboarding
                      </p>
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        Progress {conversation.progress?.percent ?? 0}% | State{" "}
                        {conversation.flow_instance.state}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {expanded && !loading && !skipped && !showConversationList && (
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
                        ? "sage-reply-md max-w-[80%] rounded-xl bg-orange-100 px-3 py-2 text-sm text-zinc-900 dark:bg-orange-900/40 dark:text-zinc-100 [&_ul]:mt-1.5"
                        : "max-w-[80%] rounded-xl bg-zinc-200 px-3 py-2 text-sm text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100"
                    }
                  >
                    {m.role === "agent" ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={SAGE_MARKDOWN_COMPONENTS}>
                        {m.text}
                      </ReactMarkdown>
                    ) : (
                      <span className="whitespace-pre-wrap break-words">{m.text}</span>
                    )}
                  </div>
                </div>
              ))}
              {sending ? (
                <div className="flex justify-start" aria-live="polite" aria-label="Sage is replying">
                  <div className="sage-reply-md max-w-[80%] rounded-xl bg-orange-100 px-3 py-2 text-sm text-zinc-900 dark:bg-orange-900/40 dark:text-zinc-100">
                    <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                      <span>Sage is replying...</span>
                    </div>
                  </div>
                </div>
              ) : null}
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
      )}
    </section>
  );
});
