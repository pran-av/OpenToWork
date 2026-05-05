import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getProjectById } from "@/lib/db/projects";
import { getCampaignsByProjectId, getActiveCampaignByProjectId } from "@/lib/db/campaigns";
import ProjectOverviewClient from "./ProjectOverviewClient";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectOverviewPage({ params }: PageProps) {
  const { projectId } = await params;
  const project = await getProjectById(projectId);

  if (!project) {
    notFound();
  }

  const campaigns = await getCampaignsByProjectId(projectId);
  const activeCampaign = await getActiveCampaignByProjectId(projectId);

  return (
    <Suspense
      fallback={
        <div className="flex min-h-[240px] items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">
          Loading project…
        </div>
      }
    >
      <ProjectOverviewClient
        project={project}
        initialCampaigns={campaigns}
        initialActiveCampaign={activeCampaign}
      />
    </Suspense>
  );
}
