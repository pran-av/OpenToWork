import { NextResponse } from "next/server";
import { getAgentAccessToken } from "@/lib/agent-auth";
import { agentRequest } from "@/lib/agent-api";
import { noStoreJsonResponse } from "@/lib/utils/api-cache";
import type { ActiveOnboardingConversationsResponse } from "@/lib/agent-onboarding-types";

export type { ActiveOnboardingConversationsResponse };

/**
 * GET /api/agent/onboarding/active-conversations
 * Proxies GET /api/v1/onboarding/active-conversations (v0.2.3).
 */
export async function GET() {
  try {
    const { token, error: authError } = await getAgentAccessToken();
    if (authError || !token) {
      return noStoreJsonResponse({ error: authError ?? "Authentication required" }, 401);
    }

    const { ok, status, data } = await agentRequest<ActiveOnboardingConversationsResponse>({
      accessToken: token,
      method: "GET",
      path: "/onboarding/active-conversations",
    });

    if (!ok) {
      return NextResponse.json(data, { status });
    }

    return noStoreJsonResponse(data);
  } catch (error) {
    console.error("Error fetching active onboarding conversations:", error);
    return noStoreJsonResponse({ error: "Failed to fetch active conversations" }, 500);
  }
}
