import { NextResponse } from "next/server";
import { getAgentAccessToken } from "@/lib/agent-auth";
import { agentRequest } from "@/lib/agent-api";
import { noStoreJsonResponse } from "@/lib/utils/api-cache";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jdId: string }> }
) {
  try {
    const { jdId } = await params;
    if (!jdId) {
      return NextResponse.json({ error: "JD ID required" }, { status: 400 });
    }

    const { token, error: authError } = await getAgentAccessToken();
    if (authError || !token) {
      return noStoreJsonResponse({ error: authError ?? "Authentication required" }, 401);
    }

    const { ok, status, data } = await agentRequest({
      accessToken: token,
      method: "GET",
      path: `/job-descriptions/${jdId}`,
    });

    if (!ok) {
      return NextResponse.json(data, { status });
    }
    return noStoreJsonResponse(data);
  } catch (error) {
    console.error("Error fetching job description:", error);
    return noStoreJsonResponse({ error: "Failed to fetch job description" }, 500);
  }
}
