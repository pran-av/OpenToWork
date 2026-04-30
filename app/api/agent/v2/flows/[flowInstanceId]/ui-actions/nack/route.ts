import { NextRequest, NextResponse } from "next/server";
import { getAgentAccessToken } from "@/lib/agent-auth";
import { agentRequest } from "@/lib/agent-api";
import { noStoreJsonResponse } from "@/lib/utils/api-cache";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ flowInstanceId: string }> }
) {
  try {
    const { flowInstanceId } = await params;
    if (!flowInstanceId) {
      return NextResponse.json({ error: "Flow instance ID required" }, { status: 400 });
    }

    const body = (await request.json()) as {
      target?: unknown;
      state?: unknown;
      metadata?: unknown;
    };
    if (typeof body.target !== "string" || !body.target.trim()) {
      return NextResponse.json({ error: "target is required" }, { status: 400 });
    }
    if (typeof body.state !== "string" || !body.state.trim()) {
      return NextResponse.json({ error: "state is required" }, { status: 400 });
    }

    const payload: Record<string, unknown> = {
      target: body.target.trim(),
      state: body.state.trim(),
    };
    if (body.metadata && typeof body.metadata === "object") {
      payload.metadata = body.metadata;
    }

    const { token, error: authError } = await getAgentAccessToken();
    if (authError || !token) {
      return noStoreJsonResponse({ error: authError ?? "Authentication required" }, 401);
    }

    const { ok, status, data } = await agentRequest({
      accessToken: token,
      method: "POST",
      path: `/flows/${flowInstanceId}/ui-actions/nack`,
      body: payload,
      apiPrefix: "/api/v2",
    });

    if (!ok) {
      return NextResponse.json(data, { status });
    }
    return noStoreJsonResponse(data);
  } catch (error) {
    console.error("Error nacking v2 flow ui action:", error);
    return noStoreJsonResponse({ error: "Failed to nack ui action" }, 500);
  }
}
