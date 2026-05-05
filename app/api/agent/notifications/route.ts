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

    const unreadOnly = request.nextUrl.searchParams.get("unread_only") === "true";
    const limit = request.nextUrl.searchParams.get("limit") ?? "50";
    const path = `/notifications/?unread_only=${unreadOnly}&limit=${limit}`;

    const { ok, status, data } = await agentRequest<{
      notifications: Array<{
        id: number;
        type: string;
        task_id: string | null;
        payload: Record<string, unknown>;
        read_at: string | null;
        created_at: string;
      }>;
      total: number;
    }>({
      accessToken: token,
      method: "GET",
      path,
    });

    if (!ok) {
      return NextResponse.json(data, { status });
    }
    return noStoreJsonResponse(data);
  } catch (error) {
    console.error("Error listing notifications:", error);
    return noStoreJsonResponse(
      { error: "Failed to list notifications" },
      500
    );
  }
}
