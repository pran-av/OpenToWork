"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ProjectData } from "@/lib/db/projects";
import type { CampaignData } from "@/lib/db/campaigns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Copy, Settings } from "lucide-react";

interface ProjectOverviewClientProps {
  project: ProjectData;
  initialCampaigns: CampaignData[];
  initialActiveCampaign: CampaignData | null;
}

export default function ProjectOverviewClient({
  project,
  initialCampaigns,
  initialActiveCampaign,
}: ProjectOverviewClientProps) {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<CampaignData[]>(initialCampaigns);
  const [activeCampaign, setActiveCampaign] = useState<CampaignData | null>(initialActiveCampaign);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [campaignName, setCampaignName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<string>("");

  const fetchCampaigns = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/projects/${project.project_id}/campaigns`);
      const data = await res.json();
      if (res.ok) {
        setCampaigns(data.campaigns || []);
        setActiveCampaign(data.activeCampaign || null);
      }
    } catch (error) {
      console.error("Error fetching campaigns:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCampaign = async () => {
    if (!campaignName.trim()) {
      setError("Campaign name is required");
      return;
    }

    if (campaignName.trim().length > 25) {
      setError("Campaign name must be 25 characters or less");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${project.project_id}/campaigns`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ campaignName: campaignName.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create campaign");
        setIsCreating(false);
        return;
      }

      // Refresh campaigns list
      await fetchCampaigns();
      setIsDialogOpen(false);
      setCampaignName("");
      setError(null);
      
      // Navigate to the new campaign
      router.push(`/dashboard/projects/${project.project_id}/campaigns/${data.campaign.campaign_id}`);
    } catch (error) {
      setError("An unexpected error occurred");
      setIsCreating(false);
    }
  };

  const handleCopyUrl = async () => {
    if (!project.project_url) return;
    
    const fullUrl = `${window.location.origin}${project.project_url}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopyStatus("Copied!");
      setTimeout(() => setCopyStatus(""), 2000);
    } catch (err) {
      console.error("Failed to copy URL:", err);
      setCopyStatus("Failed to copy");
    }
  };

  const remainingCampaigns = campaigns.filter(
    (c) => c.campaign_status !== "ACTIVE"
  );

  const hasActiveCampaign = activeCampaign !== null;

  return (
    <div className="space-y-6">
      {/* Project Details Section */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-semibold text-black dark:text-zinc-50">
                {project.project_name}
              </h2>
            </div>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Created {new Date(project.created_at).toLocaleDateString()}
            </p>
            {hasActiveCampaign && project.project_url && (
              <div className="mt-4 flex items-center gap-2">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  {project.project_url}
                </span>
                <button
                  onClick={handleCopyUrl}
                  className="flex items-center justify-center rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  title="Copy Project URL"
                >
                  <Copy className="h-4 w-4" />
                </button>
                {copyStatus && (
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {copyStatus}
                  </span>
                )}
              </div>
            )}
          </div>
          <DropdownMenu
            trigger={
              <div className="flex items-center justify-center rounded-md p-2 text-zinc-500 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800">
                <Settings className="h-5 w-5" />
              </div>
            }
          >
            <DropdownMenuItem
              onClick={() => {
                // Archive functionality will be implemented in P6
                console.log("Archive project");
              }}
            >
              Archive Project
            </DropdownMenuItem>
          </DropdownMenu>
        </div>
      </div>

      {/* Create Campaign Button - Top Right (if campaigns exist) */}
      {campaigns.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={() => setIsDialogOpen(true)}
            disabled={project.is_archived}
            className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
          >
            Create New Campaign
          </button>
        </div>
      )}

      {/* Active Campaign Section */}
      {hasActiveCampaign ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="mb-4 text-lg font-semibold text-black dark:text-zinc-50">
            Currently Active Campaign
          </h3>
          <div className="space-y-2">
            <div>
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {activeCampaign.campaign_name}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Created {new Date(activeCampaign.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200">
                Active
              </span>
              {campaigns.length > 1 && (
                <Link
                  href={`/dashboard/projects/${project.project_id}/campaigns/${activeCampaign.campaign_id}`}
                  className="ml-auto rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                >
                  Switch Campaign
                </Link>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Publish at least one campaign to generate shareable link
          </p>
        </div>
      )}

      {/* Remaining Campaigns Section */}
      {remainingCampaigns.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-black dark:text-zinc-50">
            Other Campaigns
          </h3>
          <div className="space-y-3">
            {remainingCampaigns.map((campaign) => (
              <Link
                key={campaign.campaign_id}
                href={`/dashboard/projects/${project.project_id}/campaigns/${campaign.campaign_id}`}
                className="block rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 dark:hover:bg-zinc-800"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-black dark:text-zinc-50">
                      {campaign.campaign_name}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      Created {new Date(campaign.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      campaign.campaign_status === "DRAFT"
                        ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                        : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                    }`}
                  >
                    {campaign.campaign_status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Create Campaign CTA - Center (if no campaigns) */}
      {campaigns.length === 0 && (
        <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4 rounded-lg border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-center text-zinc-600 dark:text-zinc-400">
            You don't have any campaigns yet.
          </p>
          <button
            onClick={() => setIsDialogOpen(true)}
            disabled={project.is_archived}
            className="rounded-md bg-black px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
          >
            Create a campaign
          </button>
        </div>
      )}

      {/* Create Campaign Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) {
          setCampaignName("");
          setError(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Campaign</DialogTitle>
            <DialogDescription>
              Enter a name for your campaign. Campaign names must be unique and cannot exceed 25 characters.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="campaign-name"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Campaign Name
              </label>
              <input
                id="campaign-name"
                type="text"
                value={campaignName}
                onChange={(e) => {
                  setCampaignName(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isCreating) {
                    handleCreateCampaign();
                  }
                }}
                maxLength={25}
                className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-black placeholder-zinc-400 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-zinc-600 dark:focus:ring-zinc-600 sm:text-sm"
                placeholder="My Campaign"
                disabled={isCreating}
                autoFocus
              />
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {campaignName.length}/25 characters
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
              onClick={() => {
                setIsDialogOpen(false);
                setCampaignName("");
                setError(null);
              }}
              disabled={isCreating}
              className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateCampaign}
              disabled={isCreating || !campaignName.trim()}
              className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
            >
              {isCreating ? "Creating..." : "Create Campaign"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

