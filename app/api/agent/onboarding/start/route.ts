import { NextRequest, NextResponse } from "next/server";
import { getAgentAccessToken } from "@/lib/agent-auth";
import { agentRequest } from "@/lib/agent-api";
import { noStoreJsonResponse } from "@/lib/utils/api-cache";
import type { OnboardingStartResponse } from "@/lib/agent-onboarding-types";

export type { OnboardingStartResponse };

/**
 * POST /api/agent/onboarding/start
 * Proxies POST /api/v1/onboarding/start (api_contracts/agent-serviceapi-v0.2.1.md).
 */
export async function POST(request: NextRequest) {
  try {
    const { token, error: authError } = await getAgentAccessToken();
    if (authError || !token) {
      return noStoreJsonResponse({ error: authError ?? "Authentication required" }, 401);
    }

    let body: Record<string, unknown> = {};
    try {
      const text = await request.text();
      if (text) body = JSON.parse(text) as Record<string, unknown>;
    } catch {
      body = {};
    }

    const payload: Record<string, unknown> = {};
    if (body.conversation_id != null && typeof body.conversation_id === "string") {
      payload.conversation_id = body.conversation_id;
    }

    const { ok, status, data } = await agentRequest<OnboardingStartResponse>({
      accessToken: token,
      method: "POST",
      path: "/onboarding/start",
      body: Object.keys(payload).length ? payload : {},
    });

    if (!ok) {
      return NextResponse.json(data, { status });
    }
    return noStoreJsonResponse(data);
  } catch (error) {
    console.error("Error starting onboarding:", error);
    return noStoreJsonResponse({ error: "Failed to start onboarding" }, 500);
  }
}
