import { NextResponse } from "next/server";
import { getAgentAccessToken } from "@/lib/agent-auth";
import { agentRequest } from "@/lib/agent-api";
import { noStoreJsonResponse } from "@/lib/utils/api-cache";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ jdId: string }> }
) {
  try {
    const { jdId } = await params;
    if (!jdId) {
      return NextResponse.json({ error: "JD ID required" }, { status: 400 });
    }

    const body = (await request.json()) as { applied_outcome?: unknown };
    if (typeof body.applied_outcome !== "string" || !body.applied_outcome.trim()) {
      return NextResponse.json({ error: "applied_outcome is required" }, { status: 400 });
    }

    const { token, error: authError } = await getAgentAccessToken();
    if (authError || !token) {
      return noStoreJsonResponse({ error: authError ?? "Authentication required" }, 401);
    }

    const { ok, status, data } = await agentRequest({
      accessToken: token,
      method: "PATCH",
      path: `/job-descriptions/${jdId}/outcome`,
      body: { applied_outcome: body.applied_outcome.trim() },
    });

    if (!ok) {
      return NextResponse.json(data, { status });
    }
    return noStoreJsonResponse(data);
  } catch (error) {
    console.error("Error updating job description outcome:", error);
    return noStoreJsonResponse({ error: "Failed to update JD outcome" }, 500);
  }
}
