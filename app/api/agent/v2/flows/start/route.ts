import { NextRequest, NextResponse } from "next/server";
import { getAgentAccessToken } from "@/lib/agent-auth";
import { agentRequest } from "@/lib/agent-api";
import { noStoreJsonResponse } from "@/lib/utils/api-cache";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      flow_type?: unknown;
      conversation_id?: unknown;
    };
    if (typeof body.flow_type !== "string" || !body.flow_type.trim()) {
      return NextResponse.json({ error: "flow_type is required" }, { status: 400 });
    }

    const payload: Record<string, unknown> = { flow_type: body.flow_type.trim() };
    if (typeof body.conversation_id === "string" || body.conversation_id === null) {
      payload.conversation_id = body.conversation_id;
    }

    const { token, error: authError } = await getAgentAccessToken();
    if (authError || !token) {
      return noStoreJsonResponse({ error: authError ?? "Authentication required" }, 401);
    }

    const { ok, status, data } = await agentRequest({
      accessToken: token,
      method: "POST",
      path: "/flows/start",
      body: payload,
      apiPrefix: "/api/v2",
    });

    if (!ok) {
      return NextResponse.json(data, { status });
    }
    return noStoreJsonResponse(data);
  } catch (error) {
    console.error("Error starting v2 flow:", error);
    return noStoreJsonResponse({ error: "Failed to start flow" }, 500);
  }
}
