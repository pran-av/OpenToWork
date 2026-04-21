"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type ChatMessage = { role: "agent" | "user"; text: string };

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

export interface OnboardingAgentPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Desktop-only sample onboarding chat (wireframe-style).
 * Uses BFF routes that proxy the Agent Service onboarding API.
 */
export function OnboardingAgentPanel({ isOpen, onClose }: OnboardingAgentPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [nextStep, setNextStep] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setMessages([]);
      setConversationId(null);
      setStatus(null);
      setNextStep(null);
      setError(null);
      setInput("");
      setLoading(false);
      setSending(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/agent/onboarding/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        });
        const data = (await res.json()) as {
          conversation_id?: string;
          agent_message?: string;
          status?: string;
          next_step?: string;
        };
        if (cancelled) return;
        if (!res.ok) {
          setError(getDetailMessage(data));
          setLoading(false);
          return;
        }
        if (data.conversation_id && data.agent_message != null) {
          setConversationId(data.conversation_id);
          setMessages([{ role: "agent", text: data.agent_message }]);
          setStatus(data.status ?? null);
          setNextStep(data.next_step ?? null);
        } else {
          setError("Unexpected response from onboarding start");
        }
      } catch {
        if (!cancelled) setError("Network error starting onboarding");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

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
      const data = (await res.json()) as {
        agent_message?: string;
        status?: string;
        next_step?: string | null;
        profile_created?: boolean | null;
      };
      if (!res.ok) {
        setError(getDetailMessage(data));
        setSending(false);
        return;
      }
      const reply = typeof data.agent_message === "string" ? data.agent_message : "";
      if (reply) {
        setMessages((prev) => [...prev, { role: "agent", text: reply }]);
      }
      setStatus(data.status ?? null);
      setNextStep(data.next_step ?? null);
    } catch {
      setError("Network error sending message");
    } finally {
      setSending(false);
    }
  }, [conversationId, input, loading, sending]);

  if (!isOpen) return null;

  return (
    <aside
      className="hidden shrink-0 flex-col border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 lg:flex lg:mt-0 lg:w-[min(100%,380px)] lg:border-l lg:border-t-0 lg:rounded-lg lg:border lg:border-zinc-200 lg:shadow-sm dark:lg:border-zinc-700"
      aria-label="Onboarding agent"
    >
      <div className="flex items-center justify-end border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
        <button
          type="button"
          onClick={onClose}
          className="text-sm font-medium text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          close
        </button>
      </div>

      <div className="flex max-h-[min(560px,calc(100vh-12rem))] min-h-[320px] flex-1 flex-col overflow-hidden">
        {(nextStep || status) && (
          <div className="border-b border-zinc-100 px-3 py-1.5 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            {status && <span className="mr-2">Status: {status}</span>}
            {nextStep && <span>Next: {nextStep}</span>}
          </div>
        )}

        <div className="flex-1 space-y-3 overflow-y-auto p-3">
          {loading && messages.length === 0 && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Starting conversation…</p>
          )}
          {messages.map((m, i) => (
            <div
              key={`${m.role}-${i}`}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={
                  m.role === "agent"
                    ? "max-w-[85%] rounded-lg bg-zinc-200 px-3 py-2 text-sm text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100"
                    : "max-w-[85%] rounded-lg bg-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:bg-zinc-600 dark:text-zinc-50"
                }
              >
                {m.text}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {error && (
          <div className="border-t border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="border-t border-zinc-200 p-3 dark:border-zinc-800">
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
              placeholder="Add text here...."
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
    </aside>
  );
}
