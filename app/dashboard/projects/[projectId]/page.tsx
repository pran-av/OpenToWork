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
    <ProjectOverviewClient
      project={project}
      initialCampaigns={campaigns}
      initialActiveCampaign={activeCampaign}
    />
  );
}
