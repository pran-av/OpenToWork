import { NextRequest, NextResponse } from "next/server";
import { getAgentAccessToken } from "@/lib/agent-auth";
import { agentRequest, getAgentApiBaseUrl } from "@/lib/agent-api";
import { noStoreJsonResponse } from "@/lib/utils/api-cache";

export async function GET(request: NextRequest) {
  try {
    const { token, error: authError } = await getAgentAccessToken();
    if (authError || !token) {
      return noStoreJsonResponse({ error: authError ?? "Authentication required" }, 401);
    }

    const includeInactive = request.nextUrl.searchParams.get("include_inactive") === "true";
    const path = `resumes/?include_inactive=${includeInactive}`;
    const { ok, status, data } = await agentRequest<{ resumes: unknown[]; total: number }>({
      accessToken: token,
      method: "GET",
      path,
    });

    if (!ok) {
      return NextResponse.json(data, { status });
    }
    return noStoreJsonResponse(data);
  } catch (error) {
    console.error("Error listing resumes:", error);
    return noStoreJsonResponse(
      { error: "Failed to list resumes" },
      500
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { token, error: authError } = await getAgentAccessToken();
    if (authError || !token) {
      return noStoreJsonResponse({ error: authError ?? "Authentication required" }, 401);
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const resumeName = (formData.get("resume_name") as string) ?? undefined;
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "PDF file is required", detail: "Missing or invalid file" },
        { status: 400 }
      );
    }
    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Only PDF files are accepted", detail: "Invalid file type" },
        { status: 400 }
      );
    }

    const body = new FormData();
    body.append("file", file);
    if (resumeName?.trim()) body.append("resume_name", resumeName.trim());

    const base = getAgentApiBaseUrl().replace("/api/v1", "");
    const url = `${base}/api/v1/resumes/upload`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body,
    });

    const contentType = res.headers.get("content-type") ?? "";
    const data = contentType.includes("application/json")
      ? await res.json()
      : { detail: await res.text() };

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Error uploading resume:", error);
    return noStoreJsonResponse(
      { error: "Failed to upload resume" },
      500
    );
  }
}
