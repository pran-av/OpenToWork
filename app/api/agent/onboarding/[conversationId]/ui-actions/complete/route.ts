import { NextRequest, NextResponse } from "next/server";
import { getAgentAccessToken } from "@/lib/agent-auth";
import { agentRequest } from "@/lib/agent-api";
import { noStoreJsonResponse } from "@/lib/utils/api-cache";
import type {
  CompleteOnboardingUiActionRequest,
  CompleteOnboardingUiActionResponse,
} from "@/lib/agent-onboarding-types";

export type { CompleteOnboardingUiActionRequest, CompleteOnboardingUiActionResponse };

/**
 * POST /api/agent/onboarding/[conversationId]/ui-actions/complete
 * Proxies POST /api/v1/onboarding/{conversation_id}/ui-actions/complete (v0.2.3).
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

    const body = (await request.json()) as Partial<CompleteOnboardingUiActionRequest>;
    if (!body.target || typeof body.target !== "string") {
      return NextResponse.json({ error: "target is required" }, { status: 400 });
    }
    if (!body.step_id || typeof body.step_id !== "string") {
      return NextResponse.json({ error: "step_id is required" }, { status: 400 });
    }
    if (typeof body.completed !== "boolean") {
      return NextResponse.json({ error: "completed must be boolean" }, { status: 400 });
    }

    const payload: CompleteOnboardingUiActionRequest = {
      target: body.target,
      step_id: body.step_id,
      completed: body.completed,
      metadata:
        body.metadata && typeof body.metadata === "object"
          ? (body.metadata as Record<string, unknown>)
          : { source: "client" },
    };

    const { ok, status, data } = await agentRequest<CompleteOnboardingUiActionResponse>({
      accessToken: token,
      method: "POST",
      path: `/onboarding/${conversationId}/ui-actions/complete`,
      body: payload,
    });

    if (!ok) {
      return NextResponse.json(data, { status });
    }

    return noStoreJsonResponse(data);
  } catch (error) {
    console.error("Error completing onboarding ui action:", error);
    return noStoreJsonResponse({ error: "Failed to complete onboarding ui action" }, 500);
  }
}
