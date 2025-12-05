import { notFound } from "next/navigation";
import { getProjectById } from "@/lib/db/projects";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectOverviewPage({ params }: PageProps) {
  const { projectId } = await params;
  const project = await getProjectById(projectId);

  if (!project) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-black dark:text-zinc-50">
          {project.project_name}
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Created {new Date(project.created_at).toLocaleDateString()}
        </p>
      </div>

      {/* Project Overview content will be implemented in P3 */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Project overview content will be implemented in P3
        </p>
      </div>
    </div>
  );
}

