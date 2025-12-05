"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ProjectData } from "@/lib/db/projects";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export default function DashboardPage() {
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/projects");
      const data = await res.json();
      if (res.ok) {
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!projectName.trim()) {
      setError("Project name is required");
      return;
    }

    if (projectName.trim().length > 50) {
      setError("Project name must be 50 characters or less");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ projectName: projectName.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create project");
        setIsCreating(false);
        return;
      }

      // Redirect to project overview page
      router.push(`/dashboard/projects/${data.project.project_id}`);
    } catch (error) {
      setError("An unexpected error occurred");
      setIsCreating(false);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setProjectName("");
    setError(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading projects...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-black dark:text-zinc-50">
            Projects
          </h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Manage your projects and campaigns
          </p>
        </div>
        {projects.length > 0 && (
          <button
            onClick={() => setIsDialogOpen(true)}
            className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
          >
            Create New Project
          </button>
        )}
      </div>

      {projects.length === 0 ? (
        <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4 rounded-lg border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-center text-zinc-600 dark:text-zinc-400">
            You don't have any projects yet.
          </p>
          <button
            onClick={() => setIsDialogOpen(true)}
            className="rounded-md bg-black px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
          >
            Create a project
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((project) => (
            <div
              key={project.project_id}
              className="group rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 dark:hover:bg-zinc-800"
            >
              <div className="flex items-center justify-between">
                <Link
                  href={`/dashboard/projects/${project.project_id}`}
                  className="flex-1"
                >
                  <h3 className="font-semibold text-black dark:text-zinc-50">
                    {project.project_name}
                  </h3>
                  {project.project_url ? (
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                      {project.project_url}
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                      No active campaign
                    </p>
                  )}
                </Link>
                <div className="ml-4 flex items-center gap-2">
                  {project.project_url && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const fullUrl = `${window.location.origin}${project.project_url}`;
                        navigator.clipboard.writeText(fullUrl);
                      }}
                      className="opacity-0 text-xs text-zinc-500 transition-opacity hover:text-zinc-700 group-hover:opacity-100 dark:text-zinc-400 dark:hover:text-zinc-200"
                      title="Copy full URL"
                    >
                      📋
                    </button>
                  )}
                  {project.is_archived && (
                    <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                      Archived
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Enter a name for your project. Project names must be unique and cannot exceed 50 characters.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="project-name"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Project Name
              </label>
              <input
                id="project-name"
                type="text"
                value={projectName}
                onChange={(e) => {
                  setProjectName(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isCreating) {
                    handleCreateProject();
                  }
                }}
                maxLength={50}
                className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-black placeholder-zinc-400 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-zinc-600 dark:focus:ring-zinc-600 sm:text-sm"
                placeholder="My Project"
                disabled={isCreating}
                autoFocus
              />
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {projectName.length}/50 characters
              </p>
              {error && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {error}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <button
              onClick={handleDialogClose}
              disabled={isCreating}
              className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateProject}
              disabled={isCreating || !projectName.trim()}
              className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
            >
              {isCreating ? "Creating..." : "Create Project"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
