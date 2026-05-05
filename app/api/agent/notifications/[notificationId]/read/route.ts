import { NextResponse } from "next/server";
import { getAgentAccessToken } from "@/lib/agent-auth";
import { agentRequest } from "@/lib/agent-api";
import { noStoreJsonResponse } from "@/lib/utils/api-cache";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ notificationId: string }> }
) {
  try {
    const { notificationId } = await params;
    if (!notificationId) {
      return NextResponse.json({ error: "Notification ID required" }, { status: 400 });
    }

    const { token, error: authError } = await getAgentAccessToken();
    if (authError || !token) {
      return noStoreJsonResponse({ error: authError ?? "Authentication required" }, 401);
    }

    const { ok, status, data } = await agentRequest({
      accessToken: token,
      method: "POST",
      path: `/notifications/${notificationId}/read`,
    });

    if (!ok) {
      return NextResponse.json(data, { status });
    }
    return noStoreJsonResponse(data);
  } catch (error) {
    console.error("Error marking notification read:", error);
    return noStoreJsonResponse(
      { error: "Failed to mark notification as read" },
      500
    );
  }
}
