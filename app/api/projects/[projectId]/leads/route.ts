import { NextRequest, NextResponse } from "next/server";
import { getLeadsByProjectId } from "@/lib/db/campaigns";
import { getProjectById } from "@/lib/db/projects";

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { projectId } = await params;
    
    // Verify project exists and user has access
    const project = await getProjectById(projectId);
    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Get pagination parameters from query string
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

    // Validate pagination parameters
    if (page < 1 || pageSize < 1 || pageSize > 100) {
      return NextResponse.json(
        { error: "Invalid pagination parameters" },
        { status: 400 }
      );
    }

    const result = await getLeadsByProjectId(projectId, page, pageSize);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error fetching leads:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch leads",
        details: error?.message || String(error)
      },
      { status: 500 }
    );
  }
}

