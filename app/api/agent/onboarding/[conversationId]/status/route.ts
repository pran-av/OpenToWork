import { NextResponse } from "next/server";
import { getAgentAccessToken } from "@/lib/agent-auth";
import { agentRequest } from "@/lib/agent-api";
import { noStoreJsonResponse } from "@/lib/utils/api-cache";
import type { OnboardingStatusResponse } from "@/lib/agent-onboarding-types";

export type { OnboardingStatusResponse };

/**
 * GET /api/agent/onboarding/[conversationId]/status
 * Proxies GET /api/v1/onboarding/{conversation_id}/status (v0.2.2).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { conversationId } = await params;
    if (!conversationId) {
      return NextResponse.json({ error: "conversation_id required" }, { status: 400 });
    }

    const { token, error: authError } = await getAgentAccessToken();
    if (authError || !token) {
      return noStoreJsonResponse({ error: authError ?? "Authentication required" }, 401);
    }

    const { ok, status, data } = await agentRequest<OnboardingStatusResponse>({
      accessToken: token,
      method: "GET",
      path: `/onboarding/${conversationId}/status`,
    });

    if (!ok) {
      return NextResponse.json(data, { status });
    }
    return noStoreJsonResponse(data);
  } catch (error) {
    console.error("Error fetching onboarding status:", error);
    return noStoreJsonResponse({ error: "Failed to fetch onboarding status" }, 500);
  }
}
