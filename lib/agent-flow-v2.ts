"use client";

import type {
  FlowEnvelopeResponse,
  FlowListResponse,
  StepState,
} from "@/lib/agent-onboarding-types";

function getError(data: unknown): string {
  if (data && typeof data === "object") {
    const detail = (data as { detail?: unknown }).detail;
    if (typeof detail === "string" && detail.trim()) return detail;
    const error = (data as { error?: unknown }).error;
    if (typeof error === "string" && error.trim()) return error;
  }
  return "Something went wrong";
}

async function readJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

function isFlowListResponse(data: unknown): data is FlowListResponse {
  if (!data || typeof data !== "object") return false;
  const candidate = data as FlowListResponse;
  return (
    Array.isArray(candidate.flows) ||
    Array.isArray(candidate.items) ||
    Array.isArray(candidate.data)
  );
}

export async function startOnboardingFlowV2(): Promise<FlowEnvelopeResponse> {
  const res = await fetch("/api/agent/v2/flows/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      flow_type: "ONBOARDING",
      conversation_id: null,
    }),
  });
  const data = (await readJson(res)) as FlowEnvelopeResponse | { error?: string; detail?: string };
  if (!res.ok) throw new Error(getError(data));
  return data as FlowEnvelopeResponse;
}

export async function listActiveOnboardingFlowsV2(): Promise<FlowEnvelopeResponse[]> {
  const res = await fetch("/api/agent/v2/flows?status=FLOW_ACTIVE&type=ONBOARDING");
  const data = (await readJson(res)) as FlowListResponse | { error?: string; detail?: string };
  if (!res.ok) throw new Error(getError(data));
  if (!isFlowListResponse(data)) return [];
  return data.flows ?? data.items ?? data.data ?? [];
}

export async function getFlowV2(flowInstanceId: string): Promise<FlowEnvelopeResponse> {
  const res = await fetch(`/api/agent/v2/flows/${flowInstanceId}`);
  const data = (await readJson(res)) as FlowEnvelopeResponse | { error?: string; detail?: string };
  if (!res.ok) throw new Error(getError(data));
  return data as FlowEnvelopeResponse;
}

export async function ackFlowUiActionV2(
  flowInstanceId: string,
  target: string,
  state: StepState,
  metadata?: Record<string, unknown>
): Promise<FlowEnvelopeResponse> {
  const res = await fetch(`/api/agent/v2/flows/${flowInstanceId}/ui-actions/ack`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ target, state, metadata }),
  });
  const data = (await readJson(res)) as FlowEnvelopeResponse | { error?: string; detail?: string };
  if (!res.ok) throw new Error(getError(data));
  return data as FlowEnvelopeResponse;
}

export async function ackFlowStepV2(
  flowInstanceId: string,
  stepKey: string,
  state: StepState
): Promise<FlowEnvelopeResponse> {
  const res = await fetch(`/api/agent/v2/flows/${flowInstanceId}/steps/${stepKey}/ack`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state }),
  });
  const data = (await readJson(res)) as FlowEnvelopeResponse | { error?: string; detail?: string };
  if (!res.ok) throw new Error(getError(data));
  return data as FlowEnvelopeResponse;
}
