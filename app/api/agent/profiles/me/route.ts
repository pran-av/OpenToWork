import { NextResponse } from "next/server";
import { getAgentAccessToken } from "@/lib/agent-auth";
import { agentRequest } from "@/lib/agent-api";
import { noStoreJsonResponse } from "@/lib/utils/api-cache";

export type AgentProfileResponse = {
  id: string;
  user_id: string;
  user_type: string;
  current_version: number;
  experience_summary: string | null;
  goals_summary: string | null;
  references_json: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

/**
 * GET /api/agent/profiles/me
 * Proxies GET /api/v1/profiles/me.
 */
export async function GET() {
  try {
    const { token, error: authError } = await getAgentAccessToken();
    if (authError || !token) {
      return noStoreJsonResponse({ error: authError ?? "Authentication required" }, 401);
    }

    const { ok, status, data } = await agentRequest<AgentProfileResponse>({
      accessToken: token,
      method: "GET",
      path: "/profiles/me",
    });

    if (!ok) {
      return NextResponse.json(data, { status });
    }

    return noStoreJsonResponse(data);
  } catch (error) {
    console.error("Error fetching agent profile:", error);
    return noStoreJsonResponse({ error: "Failed to fetch profile" }, 500);
  }
}
