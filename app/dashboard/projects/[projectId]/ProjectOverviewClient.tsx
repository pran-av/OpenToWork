"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ProjectData } from "@/lib/db/projects";
import type { CampaignData, LeadData } from "@/lib/db/campaigns";
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
  
  // Switch Campaign Modal state
  const [isSwitchModalOpen, setIsSwitchModalOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [selectedTargetCampaignId, setSelectedTargetCampaignId] = useState<string>("");
  
  // Tab state
  const [activeTab, setActiveTab] = useState<"overview" | "leads">("overview");
  
  // Leads state
  const [leads, setLeads] = useState<LeadData[]>([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);
  const [leadsPage, setLeadsPage] = useState(1);
  const [leadsTotal, setLeadsTotal] = useState(0);
  const [leadsPageSize] = useState(20);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isArchived, setIsArchived] = useState(project.is_archived);

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

  const markActiveCampaignPaused = () => {
    if (!activeCampaign) return;
    setActiveCampaign({ ...activeCampaign, campaign_status: "PAUSED" });
    setCampaigns((prev) =>
      prev.map((c) =>
        c.campaign_id === activeCampaign.campaign_id
          ? { ...c, campaign_status: "PAUSED" }
          : c
      )
    );
  };

  const handleArchiveProject = async () => {
    setIsArchiving(true);
    try {
      const res = await fetch(`/api/projects/${project.project_id}/archive`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || data?.message || "Failed to archive project");
      }
      setIsArchived(true);
      markActiveCampaignPaused();
      setIsArchiveModalOpen(false);
    } catch (error) {
      console.error("Failed to archive project:", error);
      alert("Failed to archive project. Please try again.");
    } finally {
      setIsArchiving(false);
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

  // Fetch leads when Leads tab is active
  const fetchLeads = useCallback(async (page: number = 1) => {
    setIsLoadingLeads(true);
    try {
      const res = await fetch(`/api/projects/${project.project_id}/leads?page=${page}&pageSize=${leadsPageSize}`);
      const data = await res.json();
      if (res.ok) {
        setLeads(data.leads || []);
        setLeadsTotal(data.total || 0);
        setLeadsPage(data.page || 1);
      } else {
        // API call failed - show error and keep current page state
        setError(data.error || "Failed to fetch leads");
        console.error("Error fetching leads:", data.error);
      }
    } catch (error) {
      console.error("Error fetching leads:", error);
      setError("An unexpected error occurred while fetching leads");
      // Keep current page state on error - don't update leadsPage
    } finally {
      setIsLoadingLeads(false);
    }
  }, [project.project_id, leadsPageSize]);

  // Fetch leads when Leads tab is selected
  useEffect(() => {
    if (activeTab === "leads") {
      fetchLeads(1); // Always start from page 1 when switching to Leads tab
      setLeadsPage(1);
    }
  }, [activeTab, fetchLeads]);

  // Format contact info (email or phone)
  const formatContact = (lead: LeadData): string => {
    if (lead.lead_email) {
      return lead.lead_email;
    }
    if (lead.lead_phone_isd && lead.lead_phone) {
      return `${lead.lead_phone_isd} ${lead.lead_phone}`;
    }
    if (lead.lead_phone) {
      return lead.lead_phone;
    }
    return "N/A";
  };

  const totalPages = Math.ceil(leadsTotal / leadsPageSize);

  return (
    <div className="space-y-6">
      {isArchived && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          This project is archived. You can view details, but creating, switching, or publishing campaigns is disabled.
        </div>
      )}
      {/* Tabs */}
      <div className="border-b border-zinc-200 dark:border-zinc-800">
        <nav className="flex gap-4" aria-label="Tabs">
          <button
            onClick={() => setActiveTab("overview")}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "overview"
                ? "border-black text-black dark:border-zinc-50 dark:text-zinc-50"
                : "border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("leads")}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "leads"
                ? "border-black text-black dark:border-zinc-50 dark:text-zinc-50"
                : "border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
            }`}
          >
            Leads
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" ? (
        <>
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
            onClick={() => setIsArchiveModalOpen(true)}
            disabled={isArchiving || isArchived}
          >
            Archive Project
          </DropdownMenuItem>
          </DropdownMenu>
        </div>
      </div>

      {isArchived && (
        <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500 dark:bg-amber-900/20 dark:text-amber-100">
          This project is archived. Creation, publish, switch, and pause actions are disabled. Public link shows an end-of-life message.
        </div>
      )}

      {/* Create Campaign Button - Top Right (if campaigns exist) */}
      {campaigns.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={() => setIsDialogOpen(true)}
            disabled={isArchived}
            className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
          >
            Create New Campaign
          </button>
        </div>
      )}

      {/* Active Campaign Section */}
      {hasActiveCampaign ? (
        <Link
          href={`/dashboard/projects/${project.project_id}/campaigns/${activeCampaign.campaign_id}`}
          className="block rounded-lg border border-zinc-200 bg-white p-6 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 dark:hover:bg-zinc-800"
        >
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
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (isArchived) return;
                    setIsSwitchModalOpen(true);
                    // Fetch campaigns to populate dropdown
                    fetchCampaigns();
                    setSelectedTargetCampaignId("");
                  }}
                  disabled={isArchived}
                  className="ml-auto rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                >
                  Switch Campaign
                </button>
              )}
            </div>
          </div>
        </Link>
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
            disabled={isArchived}
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

      {/* Archive Project Modal */}
      <Dialog open={isArchiveModalOpen} onOpenChange={setIsArchiveModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Archive Project</DialogTitle>
            <DialogDescription>
              Once archived, a project cannot be activated again. Public links will show: "owner has archieved this campaign".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm text-zinc-700 dark:text-zinc-300">
            {hasActiveCampaign && (
              <p className="text-amber-700 dark:text-amber-300">
                Active campaign "{activeCampaign?.campaign_name}" will be paused.
              </p>
            )}
            <p>All publish/switch/pause and creation actions will be disabled.</p>
          </div>
          <DialogFooter className="flex justify-end gap-2">
            <button
              onClick={() => setIsArchiveModalOpen(false)}
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              onClick={handleArchiveProject}
              disabled={isArchiving}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isArchiving ? "Archiving..." : "Archive Project"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Switch Campaign Modal */}
      <Dialog open={isSwitchModalOpen} onOpenChange={(open) => {
        if (!isSwitching) {
          setIsSwitchModalOpen(open);
          if (!open) {
            setSelectedTargetCampaignId("");
            setError(null);
          }
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Switch Campaign</DialogTitle>
            <DialogDescription>
              {activeCampaign 
                ? `Switch from "${activeCampaign.campaign_name}" to another campaign. The current active campaign will be paused.`
                : "Select a campaign to activate. This will make it the active campaign for this project."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {activeCampaign && (
              <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Current Active Campaign:
                </p>
                <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-50">
                  {activeCampaign.campaign_name}
                </p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Switch To Campaign <span className="text-red-600 dark:text-red-400">*</span>
              </label>
              {remainingCampaigns.length === 0 ? (
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                  No other campaigns available to switch to.
                </p>
              ) : (
                <select
                  value={selectedTargetCampaignId}
                  onChange={(e) => setSelectedTargetCampaignId(e.target.value)}
                  disabled={isSwitching}
                  className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-black shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:border-zinc-600 dark:focus:ring-zinc-600 sm:text-sm"
                >
                  <option value="">Select a campaign...</option>
                  {remainingCampaigns.map((c) => (
                    <option key={c.campaign_id} value={c.campaign_id}>
                      {c.campaign_name} ({c.campaign_status})
                    </option>
                  ))}
                </select>
              )}
            </div>
            {activeCampaign && (
              <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-900/20">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>Warning:</strong> This will atomically switch campaigns. The current active campaign will be paused and the selected campaign will become active. The project URL will remain unchanged.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <button
              onClick={() => {
                setIsSwitchModalOpen(false);
                setSelectedTargetCampaignId("");
                setError(null);
              }}
              disabled={isSwitching}
              className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                if (!selectedTargetCampaignId) {
                  setError("Please select a campaign to switch to");
                  return;
                }

                setIsSwitching(true);
                setError(null);

                try {
                  const res = await fetch(`/api/campaigns/switch`, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      projectId: project.project_id,
                      targetCampaignId: selectedTargetCampaignId,
                    }),
                  });

                  const data = await res.json();

                  if (!res.ok) {
                    setError(data.error || "Failed to switch campaign");
                    setIsSwitching(false);
                    return;
                  }

                  setIsSwitchModalOpen(false);
                  setSelectedTargetCampaignId("");
                  
                  // Refresh campaigns list
                  await fetchCampaigns();
                } catch (error: any) {
                  setError(error.message || "An unexpected error occurred");
                  setIsSwitching(false);
                }
              }}
              disabled={isSwitching || !selectedTargetCampaignId || remainingCampaigns.length === 0}
              className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
            >
              {isSwitching ? "Switching..." : "Confirm Switch"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive Project Modal */}
      <Dialog open={isArchiveModalOpen} onOpenChange={(open) => {
        if (!isArchiving) {
          setIsArchiveModalOpen(open);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive Project</DialogTitle>
            <DialogDescription>
              Once archived, a project cannot be activated again. All users visiting shared links will see an end-of-life message.
              {" "}
              {hasActiveCampaign
                ? "There is currently an active campaign that will be paused."
                : "There is no active campaign."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <button
              onClick={() => setIsArchiveModalOpen(false)}
              disabled={isArchiving}
              className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                setIsArchiving(true);
                try {
                  const res = await fetch(`/api/projects/${project.project_id}/archive`, {
                    method: "POST",
                  });
                  const data = await res.json();
                  if (!res.ok) {
                    alert(data.error || "Failed to archive project");
                    return;
                  }
                  setIsArchived(true);
                  setIsArchiveModalOpen(false);
                  if (activeCampaign) {
                    setActiveCampaign(null);
                    setCampaigns((prev) =>
                      prev.map((c) =>
                        c.campaign_id === activeCampaign.campaign_id
                          ? { ...c, campaign_status: "PAUSED" }
                          : c
                      )
                    );
                  }
                } catch (err) {
                  console.error("Archive project failed:", err);
                  alert("Failed to archive project");
                } finally {
                  setIsArchiving(false);
                }
              }}
              disabled={isArchiving}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isArchiving ? "Archiving..." : "Archive Project"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </>
      ) : (
        <>
          {/* Leads Tab */}
          <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <div className="p-6">
              <h3 className="mb-4 text-lg font-semibold text-black dark:text-zinc-50">
                Leads
              </h3>
              
              {isLoadingLeads ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading leads...</p>
                </div>
              ) : leads.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">No leads found for this project.</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-200 dark:border-zinc-800">
                          <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                            Lead Name
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                            Company Name
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                            Contact
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                            Campaign Name
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {leads.map((lead) => (
                          <tr
                            key={lead.lead_id}
                            className="border-b border-zinc-100 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800"
                          >
                            <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-50">
                              {lead.lead_name}
                            </td>
                            <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-50">
                              {lead.lead_company}
                            </td>
                            <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                              {formatContact(lead)}
                            </td>
                            <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                              {lead.campaign_name || "Unknown"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="mt-4 flex items-center justify-between">
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        Showing {(leadsPage - 1) * leadsPageSize + 1} to {Math.min(leadsPage * leadsPageSize, leadsTotal)} of {leadsTotal} leads
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            const newPage = leadsPage - 1;
                            // Only update page state after successful API response
                            fetchLeads(newPage);
                          }}
                          disabled={leadsPage === 1 || isLoadingLeads}
                          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => {
                            const newPage = leadsPage + 1;
                            // Only update page state after successful API response
                            fetchLeads(newPage);
                          }}
                          disabled={leadsPage >= totalPages || isLoadingLeads}
                          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

