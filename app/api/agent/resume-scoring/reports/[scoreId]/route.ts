import { NextRequest, NextResponse } from "next/server";
import { getAgentAccessToken } from "@/lib/agent-auth";
import { agentRequest } from "@/lib/agent-api";
import { noStoreJsonResponse } from "@/lib/utils/api-cache";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ scoreId: string }> }
) {
  try {
    const { scoreId } = await params;
    if (!scoreId) {
      return NextResponse.json({ error: "Score ID required" }, { status: 400 });
    }

    const { token, error: authError } = await getAgentAccessToken();
    if (authError || !token) {
      return noStoreJsonResponse({ error: authError ?? "Authentication required" }, 401);
    }

    const { ok, status, data } = await agentRequest({
      accessToken: token,
      method: "GET",
      path: `/resume-scoring/reports/${scoreId}`,
    });

    if (!ok) {
      return NextResponse.json(data, { status });
    }
    return noStoreJsonResponse(data);
  } catch (error) {
    console.error("Error fetching report:", error);
    return noStoreJsonResponse(
      { error: "Failed to fetch report" },
      500
    );
  }
}
