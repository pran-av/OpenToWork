import { NextRequest, NextResponse } from "next/server";
import { getAgentAccessToken } from "@/lib/agent-auth";
import { agentRequest } from "@/lib/agent-api";
import { noStoreJsonResponse } from "@/lib/utils/api-cache";

export async function GET(request: NextRequest) {
  try {
    const { token, error: authError } = await getAgentAccessToken();
    if (authError || !token) {
      return noStoreJsonResponse({ error: authError ?? "Authentication required" }, 401);
    }

    const statusParam = request.nextUrl.searchParams.get("status");
    const typeParam = request.nextUrl.searchParams.get("type");
    const query = new URLSearchParams();
    if (statusParam) query.set("status", statusParam);
    if (typeParam) query.set("type", typeParam);
    const queryString = query.toString();

    const { ok, status, data } = await agentRequest({
      accessToken: token,
      method: "GET",
      path: queryString ? `/flows?${queryString}` : "/flows",
      apiPrefix: "/api/v2",
    });

    if (!ok) {
      return NextResponse.json(data, { status });
    }
    return noStoreJsonResponse(data);
  } catch (error) {
    console.error("Error listing v2 flows:", error);
    return noStoreJsonResponse({ error: "Failed to list flows" }, 500);
  }
}
