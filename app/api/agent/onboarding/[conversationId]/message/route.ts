import { NextRequest, NextResponse } from "next/server";
import { getAgentAccessToken } from "@/lib/agent-auth";
import { agentRequest } from "@/lib/agent-api";
import { noStoreJsonResponse } from "@/lib/utils/api-cache";
import type { OnboardingMessageResponse } from "@/lib/agent-onboarding-types";

export type { OnboardingMessageResponse };

/**
 * POST /api/agent/onboarding/[conversationId]/message
 * Proxies POST /api/v1/onboarding/{conversation_id}/message (v0.2.1).
 */
export async function POST(
  request: NextRequest,
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

    const body = await request.json();
    const userMessage = body?.user_message;
    if (typeof userMessage !== "string" || !userMessage.trim()) {
      return NextResponse.json({ error: "user_message is required" }, { status: 400 });
    }

    const { ok, status, data } = await agentRequest<OnboardingMessageResponse>({
      accessToken: token,
      method: "POST",
      path: `/onboarding/${conversationId}/message`,
      body: { user_message: userMessage.trim() },
    });

    if (!ok) {
      return NextResponse.json(data, { status });
    }
    return noStoreJsonResponse(data);
  } catch (error) {
    console.error("Error sending onboarding message:", error);
    return noStoreJsonResponse({ error: "Failed to send message" }, 500);
  }
}
