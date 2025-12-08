import { createServerClient } from "@/lib/supabase/server";

export interface ProjectData {
  project_id: string;
  project_name: string;
  project_url: string | null;
  is_archived: boolean;
  created_at: string;
}

export interface ProjectWithStats extends ProjectData {
  active_campaigns_count: number;
  total_campaigns_count: number;
}

/**
 * Archive a project (calls DB function archive_project)
 */
export async function archiveProject(projectId: string): Promise<{ success: boolean; message?: string }> {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const { data, error } = await supabase.rpc("archive_project", { p_project_id: projectId });

  if (error) {
    throw new Error(error.message || "Failed to archive project");
  }

  return data as { success: boolean; message?: string };
}

/**
 * Get all projects for the authenticated user
 * Ordered by latest first (created_at DESC)
 */
export async function getUserProjects(): Promise<ProjectData[]> {
  const supabase = await createServerClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data as ProjectData[];
}

/**
 * Get a project by ID (with RLS check)
 */
export async function getProjectById(projectId: string): Promise<ProjectData | null> {
  const supabase = await createServerClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    return null;
  }

  return data as ProjectData;
}

/**
 * Create a new project
 * Validates project name is unique per user (enforced at DB level)
 */
export async function createProject(projectName: string): Promise<ProjectData> {
  const supabase = await createServerClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  // Validate project name
  if (!projectName || !projectName.trim()) {
    throw new Error("Project name is required");
  }

  if (projectName.length > 50) {
    throw new Error("Project name must be 50 characters or less");
  }

  // Check for duplicate project name (per user)
  const { data: existing } = await supabase
    .from("projects")
    .select("project_id")
    .eq("user_id", user.id)
    .eq("project_name", projectName.trim())
    .single();

  if (existing) {
    throw new Error("A project with this name already exists");
  }

  // Create project
  const { data, error } = await supabase
    .from("projects")
    .insert([
      {
        user_id: user.id,
        project_name: projectName.trim(),
        is_archived: false,
      },
    ])
    .select()
    .single();

  if (error) {
    // Check if it's a unique constraint violation
    if (error.code === "23505") {
      throw new Error("A project with this name already exists");
    }
    throw new Error(`Failed to create project: ${error.message}`);
  }

  return data as ProjectData;
}

