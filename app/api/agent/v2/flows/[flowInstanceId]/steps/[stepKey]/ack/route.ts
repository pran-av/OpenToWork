import { NextRequest, NextResponse } from "next/server";
import { getAgentAccessToken } from "@/lib/agent-auth";
import { agentRequest } from "@/lib/agent-api";
import { noStoreJsonResponse } from "@/lib/utils/api-cache";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ flowInstanceId: string; stepKey: string }> }
) {
  try {
    const { flowInstanceId, stepKey } = await params;
    if (!flowInstanceId || !stepKey) {
      return NextResponse.json(
        { error: "flowInstanceId and stepKey are required" },
        { status: 400 }
      );
    }

    const body = (await request.json()) as { state?: unknown };
    if (typeof body.state !== "string" || !body.state.trim()) {
      return NextResponse.json({ error: "state is required" }, { status: 400 });
    }

    const { token, error: authError } = await getAgentAccessToken();
    if (authError || !token) {
      return noStoreJsonResponse({ error: authError ?? "Authentication required" }, 401);
    }

    const { ok, status, data } = await agentRequest({
      accessToken: token,
      method: "POST",
      path: `/flows/${flowInstanceId}/steps/${stepKey}/ack`,
      body: { state: body.state.trim() },
      apiPrefix: "/api/v2",
    });

    if (!ok) {
      return NextResponse.json(data, { status });
    }
    return noStoreJsonResponse(data);
  } catch (error) {
    console.error("Error acknowledging v2 flow step:", error);
    return noStoreJsonResponse({ error: "Failed to acknowledge step" }, 500);
  }
}
