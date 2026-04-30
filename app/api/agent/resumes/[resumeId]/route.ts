import { NextRequest, NextResponse } from "next/server";
import { getAgentAccessToken } from "@/lib/agent-auth";
import { agentRequest } from "@/lib/agent-api";
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

export async function GET(
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

    const { ok, status, data } = await agentRequest({
      accessToken: token,
      method: "GET",
      path: `/resumes/${resumeId}`,
    });

    if (!ok) {
      return NextResponse.json(data, { status });
    }
    return noStoreJsonResponse(data);
  } catch (error) {
    console.error("Error fetching resume:", error);
    return noStoreJsonResponse({ error: "Failed to fetch resume" }, 500);
  }
}

export async function PATCH(
  request: NextRequest,
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

    const body = (await request.json()) as {
      resume_name?: unknown;
      is_active_for_context?: unknown;
    };
    const payload: Record<string, string | boolean> = {};
    if (typeof body.resume_name === "string") {
      payload.resume_name = body.resume_name;
    }
    if (typeof body.is_active_for_context === "boolean") {
      payload.is_active_for_context = body.is_active_for_context;
    }
    if (Object.keys(payload).length === 0) {
      return NextResponse.json(
        { error: "At least one of resume_name or is_active_for_context is required" },
        { status: 400 }
      );
    }

    const { ok, status, data } = await agentRequest({
      accessToken: token,
      method: "PATCH",
      path: `/resumes/${resumeId}`,
      body: payload,
    });

    if (!ok) {
      return NextResponse.json(data, { status });
    }
    return noStoreJsonResponse(data);
  } catch (error) {
    console.error("Error updating resume:", error);
    return noStoreJsonResponse({ error: "Failed to update resume" }, 500);
  }
}
