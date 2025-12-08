import { NextRequest, NextResponse } from "next/server";
import { getProjectById, archiveProject } from "@/lib/db/projects";

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { projectId } = await params;

    // Ensure project exists and belongs to user (RLS enforced inside)
    const project = await getProjectById(projectId);
    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    if (project.is_archived) {
      return NextResponse.json(
        { success: true, message: "Project already archived" },
        { status: 200 }
      );
    }

    const result = await archiveProject(projectId);

    if (!result?.success) {
      return NextResponse.json(
        { error: result?.message || "Failed to archive project" },
        { status: 400 }
      );
    }

    // Fetch updated project to return latest state
    const updatedProject = await getProjectById(projectId);

    return NextResponse.json(
      {
        success: true,
        project: updatedProject ?? { ...project, is_archived: true },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error archiving project:", error);
    return NextResponse.json(
      {
        error: "Failed to archive project",
        details: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}


