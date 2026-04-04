import { NextRequest, NextResponse } from "next/server";
import { getAgentAccessToken } from "@/lib/agent-auth";
import { agentRequest } from "@/lib/agent-api";
import { isResumeAgentFeaturesDisabled } from "@/lib/resume-agent-features";
import { noStoreJsonResponse } from "@/lib/utils/api-cache";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ resumeId: string }> }
) {
  try {
    const { resumeId } = await params;
    if (!resumeId) {
      return NextResponse.json({ error: "Resume ID required" }, { status: 400 });
    }

    const { token, error: authError } = await getAgentAccessToken();
    if (authError || !token) {
      return noStoreJsonResponse({ error: authError ?? "Authentication required" }, 401);
    }

    if (isResumeAgentFeaturesDisabled()) {
      return noStoreJsonResponse(
        { error: "Resume features are temporarily unavailable" },
        503
      );
    }

    const { ok, status, data } = await agentRequest({
      accessToken: token,
      method: "DELETE",
      path: `/resumes/${resumeId}`,
    });

    if (!ok) {
      return NextResponse.json(data, { status });
    }
    return noStoreJsonResponse(data);
  } catch (error) {
    console.error("Error deleting resume:", error);
    return noStoreJsonResponse(
      { error: "Failed to delete resume" },
      500
    );
  }
}
