import { NextResponse } from "next/server";
import { getAgentApiBaseUrl } from "@/lib/agent-api";
import { noStoreJsonResponse } from "@/lib/utils/api-cache";

export async function GET() {
  try {
    const base = getAgentApiBaseUrl().replace("/api/v1", "");
    const res = await fetch(`${base}/health`, { method: "GET" });
    const contentType = res.headers.get("content-type") ?? "";
    const data = contentType.includes("application/json")
      ? await res.json()
      : { detail: await res.text() };

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }
    return noStoreJsonResponse(data);
  } catch (error) {
    console.error("Error checking agent health:", error);
    return noStoreJsonResponse({ error: "Failed to fetch agent health" }, 500);
  }
}
