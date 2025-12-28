import { NextRequest, NextResponse } from "next/server";
import { createProject, getUserProjects } from "@/lib/db/projects";
import { cachedPrivateJsonResponse } from "@/lib/utils/api-cache";

export const runtime = "edge";

export async function GET() {
  try {
    const projects = await getUserProjects();
    return cachedPrivateJsonResponse({ projects });
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { projectName } = await request.json();

    if (!projectName || typeof projectName !== "string" || !projectName.trim()) {
      return NextResponse.json(
        { error: "Project name is required" },
        { status: 400 }
      );
    }

    const project = await createProject(projectName.trim());

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    console.error("Error creating project:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to create project";
    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }
}

