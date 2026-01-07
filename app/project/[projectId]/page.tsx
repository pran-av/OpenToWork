import { notFound } from "next/navigation";
import type { Metadata } from "next";
import CampaignFlowClient from "@/app/campaign/[id]/CampaignFlowClient";
import {
  getActiveCampaignByProjectIdPublic,
  getClientServicesByProjectIdPublic,
  getCaseStudiesByProjectIdPublic,
} from "@/lib/db/campaigns";
import { getWidgetByProjectIdPublic } from "@/lib/db/widgets";
import type { CaseStudy } from "@/lib/db/campaigns";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { projectId } = await params;
  
  try {
    const activeCampaign = await getActiveCampaignByProjectIdPublic(projectId);
    
    if (!activeCampaign) {
      return {
        title: "Pitch Like This - Campaign Not Available",
        description: "This project is not serving an active campaign at the moment.",
      };
    }

    const clientName = activeCampaign.campaign_structure?.client_name || "";
    const rawClientSummary = activeCampaign.campaign_structure?.client_summary || "";
    const clientSummary = rawClientSummary.slice(0, 150);
    
    const baseUrl = "https://www.pitchlikethis.com";
    const projectUrl = `${baseUrl}/project/${projectId}`;

    return {
      title: clientName || "Review Candidate / Project Pitch",
      description: clientSummary || "This shared link includes a tailored pitch, relevant experience, and project evidence provided by the sender. Review the complete details before responding or following up.",
      openGraph: {
        title: clientName || "Review Candidate / Project Pitch",
        description: clientSummary || "This shared link includes a tailored pitch, relevant experience, and project evidence provided by the sender. Review the complete details before responding or following up.",
        url: projectUrl,
        siteName: "Pitch Like This",
        type: "website",
        images: [
          {
            url: "https://www.pitchlikethis.com/og_image_projects.png",
            width: 1200,
            height: 630,
            alt: clientName || "Review Candidate / Project Pitch",
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title: clientName || "Review Candidate / Project Pitch",
        description: clientSummary || "This shared link includes a tailored pitch, relevant experience, and project evidence provided by the sender. Review the complete details before responding or following up.",
        images: ["https://www.pitchlikethis.com/og_image_projects.png"],
      },
      alternates: {
        canonical: projectUrl,
      },
    };
  } catch (error) {
    console.error("Error generating metadata for project page:", error);
    return {
      title: "Pitch Like This",
      description: "View this pitch campaign",
    };
  }
}

export default async function ProjectPage({ params }: PageProps) {
  const { projectId } = await params;
  
  try {
    // Get active campaign for this project (public access - campaigns have public RLS for ACTIVE status)
    const activeCampaign = await getActiveCampaignByProjectIdPublic(projectId);
    
    // If no active campaign, show end-of-life message (covers archived projects)
    if (!activeCampaign) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-white">
          <div className="text-center">
            <h1 className="mb-4 text-2xl font-semibold text-zinc-900">
              Owner has archieved this campaign
            </h1>
            <p className="text-zinc-600">
              This project is not serving an active campaign at the moment.
            </p>
          </div>
        </div>
      );
    }
    
    // Fetch services for this project (using projectId for security)
    const services = await getClientServicesByProjectIdPublic(projectId);
    
    // Fetch case studies for this project (using projectId for security)
    const allCaseStudies = await getCaseStudiesByProjectIdPublic(projectId);
    
    // Map case studies by service ID for component compatibility
    const caseStudiesMap: Record<string, CaseStudy[]> = {};
    for (const caseStudy of allCaseStudies) {
      if (!caseStudiesMap[caseStudy.client_service_id]) {
        caseStudiesMap[caseStudy.client_service_id] = [];
      }
      caseStudiesMap[caseStudy.client_service_id].push(caseStudy);
    }
    
    // Fetch widget for this project (using projectId for security)
    const widget = await getWidgetByProjectIdPublic(projectId);
    
    // Render the campaign flow directly (same as /campaign/[id])
    return (
      <CampaignFlowClient
        campaign={activeCampaign}
        services={services}
        caseStudiesMap={caseStudiesMap}
        widget={widget}
      />
    );
  } catch (error) {
    console.error("Error in ProjectPage:", error);
    notFound();
  }
}

