import { NextResponse } from "next/server";
import { getAgentAccessToken } from "@/lib/agent-auth";
import { agentRequest } from "@/lib/agent-api";
import { noStoreJsonResponse } from "@/lib/utils/api-cache";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ flowInstanceId: string }> }
) {
  try {
    const { flowInstanceId } = await params;
    if (!flowInstanceId) {
      return NextResponse.json({ error: "Flow instance ID required" }, { status: 400 });
    }

    const { token, error: authError } = await getAgentAccessToken();
    if (authError || !token) {
      return noStoreJsonResponse({ error: authError ?? "Authentication required" }, 401);
    }

    const { ok, status, data } = await agentRequest({
      accessToken: token,
      method: "GET",
      path: `/flows/${flowInstanceId}`,
      apiPrefix: "/api/v2",
    });

    if (!ok) {
      return NextResponse.json(data, { status });
    }
    return noStoreJsonResponse(data);
  } catch (error) {
    console.error("Error fetching v2 flow:", error);
    return noStoreJsonResponse({ error: "Failed to fetch flow" }, 500);
  }
}
