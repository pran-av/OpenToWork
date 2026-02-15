import { NextRequest, NextResponse } from "next/server";
import { getAgentAccessToken } from "@/lib/agent-auth";
import { agentRequest } from "@/lib/agent-api";
import { noStoreJsonResponse } from "@/lib/utils/api-cache";

export async function POST(request: NextRequest) {
  try {
    const { token, error: authError } = await getAgentAccessToken();
    if (authError || !token) {
      return noStoreJsonResponse({ error: authError ?? "Authentication required" }, 401);
    }

    const body = await request.json();
    const { jd_source_type, jd_url, jd_text, resume_id } = body;
    if (!jd_source_type || (jd_source_type !== "url" && jd_source_type !== "paste")) {
      return NextResponse.json(
        { error: "jd_source_type must be 'url' or 'paste'" },
        { status: 400 }
      );
    }
    const payload: Record<string, string> = { jd_source_type };
    if (jd_source_type === "url") {
      if (!jd_url || typeof jd_url !== "string") {
        return NextResponse.json({ error: "jd_url required when jd_source_type is url" }, { status: 400 });
      }
      payload.jd_url = jd_url;
    } else {
      if (!jd_text || typeof jd_text !== "string") {
        return NextResponse.json({ error: "jd_text required when jd_source_type is paste" }, { status: 400 });
      }
      payload.jd_text = jd_text;
    }
    if (resume_id && typeof resume_id === "string") payload.resume_id = resume_id;

    const { ok, status, data } = await agentRequest<{
      task_id: string;
      task_type: string;
      status: string;
    }>({
      accessToken: token,
      method: "POST",
      path: "/tasks/resume-scoring",
      body: payload,
    });

    if (!ok) {
      return NextResponse.json(data, { status });
    }
    return NextResponse.json(data, { status: 202 });
  } catch (error) {
    console.error("Error creating resume-scoring task:", error);
    return noStoreJsonResponse(
      { error: "Failed to create task" },
      500
    );
  }
}
