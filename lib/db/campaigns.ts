import { createServerClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/server";

export interface CampaignData {
  campaign_id: string;
  project_id: string;
  campaign_name: string;
  campaign_status: 'DRAFT' | 'ACTIVE' | 'PAUSED';
  campaign_structure: {
    client_name: string;
    client_summary: string;
    client_service_id?: string;
  };
  cta_config: {
    schedule_meeting?: string;
    mailto?: string;
    linkedin?: string;
    phone?: string;
  };
  created_at: string;
}

export interface ClientService {
  client_service_id: string;
  campaign_id: string;
  client_service_name: string;
  order_index: number;
  created_at?: string;
}

export interface CaseStudy {
  case_id: string;
  client_service_id: string;
  case_name: string;
  case_summary: string;
  case_duration: string;
  case_highlights: string;
  case_study_url: string;
  created_at?: string;
}

export interface LeadData {
  lead_id: string;
  campaign_id: string;
  lead_name: string;
  lead_company: string;
  lead_email: string;
  lead_phone_isd?: string | null;
  lead_phone?: string | null;
  meeting_scheduled: boolean;
  created_at: string;
  campaign_name?: string; // Added when joining with campaigns
}

export async function getCampaignById(campaignId: string): Promise<CampaignData | null> {
  const supabase = await createServerClient();
  
  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("campaign_id", campaignId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as CampaignData;
}

export async function getCampaignsByProjectId(projectId: string): Promise<CampaignData[]> {
  const supabase = await createServerClient();
  
  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data as CampaignData[];
}

export async function getActiveCampaignByProjectId(projectId: string): Promise<CampaignData | null> {
  const supabase = await createServerClient();
  
  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("project_id", projectId)
    .eq("campaign_status", "ACTIVE")
    .single();

  if (error || !data) {
    return null;
  }

  return data as CampaignData;
}

/**
 * Get active campaign by project ID (public, no auth required)
 * Used for public project URLs
 * Uses RPC function to ensure project_id is mandatory
 */
export async function getActiveCampaignByProjectIdPublic(projectId: string): Promise<CampaignData | null> {
  const supabase = createPublicClient();
  
  const { data, error } = await supabase.rpc("get_active_campaign_by_project", {
    p_project_id: projectId,
  });

  if (error || !data || data.length === 0) {
    return null;
  }

  return data[0] as CampaignData;
}

export async function createCampaign(projectId: string, campaignName: string): Promise<CampaignData | null> {
  const supabase = await createServerClient();
  
  const { data, error } = await supabase
    .from("campaigns")
    .insert({
      project_id: projectId,
      campaign_name: campaignName,
      campaign_status: 'DRAFT',
      campaign_structure: {
        client_name: '',
        client_summary: '',
      },
      cta_config: {},
    })
    .select("*")
    .single();

  if (error) {
    console.error("Error creating campaign:", error);
    throw new Error(error.message);
  }

  return data as CampaignData;
}

export async function getClientServicesByCampaignId(
  campaignId: string
): Promise<ClientService[]> {
  const supabase = await createServerClient();
  
  const { data, error } = await supabase
    .from("client_services")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("order_index", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data as ClientService[];
}

/**
 * Get client services by project ID (public, no auth required)
 * Used for public project pages
 * Uses RPC function to ensure project_id is mandatory
 * Note: Changed from campaignId to projectId to match security requirements
 */
export async function getClientServicesByProjectIdPublic(
  projectId: string
): Promise<ClientService[]> {
  const supabase = createPublicClient();
  
  const { data, error } = await supabase.rpc("get_client_services_by_project", {
    p_project_id: projectId,
  });

  if (error || !data) {
    return [];
  }

  return data as ClientService[];
}

export async function getCaseStudiesByServiceId(
  clientServiceId: string
): Promise<CaseStudy[]> {
  const supabase = await createServerClient();
  
  const { data, error } = await supabase
    .from("case_studies")
    .select("*")
    .eq("client_service_id", clientServiceId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data as CaseStudy[];
}

/**
 * Get case studies by project ID (public, no auth required)
 * Used for public project pages
 * Uses RPC function to ensure project_id is mandatory
 * Note: Changed from serviceId to projectId to match security requirements
 */
export async function getCaseStudiesByProjectIdPublic(
  projectId: string
): Promise<CaseStudy[]> {
  const supabase = createPublicClient();
  
  const { data, error } = await supabase.rpc("get_case_studies_by_project", {
    p_project_id: projectId,
  });

  if (error || !data) {
    return [];
  }

  return data as CaseStudy[];
}

export async function isCampaignPublishable(campaignId: string): Promise<boolean> {
  const supabase = await createServerClient();
  
  const { data, error } = await supabase.rpc("is_campaign_publishable", {
    p_campaign_id: campaignId,
  });

  if (error) {
    console.error("Error checking campaign publishability:", error);
    return false;
  }

  return data === true;
}

export async function updateCampaign(
  campaignId: string,
  updates: {
    campaign_name?: string;
    campaign_structure?: CampaignData["campaign_structure"];
    cta_config?: CampaignData["cta_config"];
  }
): Promise<CampaignData | null> {
  const supabase = await createServerClient();
  
  const { data, error } = await supabase
    .from("campaigns")
    .update(updates)
    .eq("campaign_id", campaignId)
    .select("*")
    .single();

  if (error) {
    console.error("Error updating campaign:", error);
    throw new Error(error.message);
  }

  return data as CampaignData;
}

// Client Services functions
export async function createClientService(
  campaignId: string,
  serviceName: string,
  orderIndex: number
): Promise<ClientService> {
  const supabase = await createServerClient();
  
  const { data, error } = await supabase
    .from("client_services")
    .insert({
      campaign_id: campaignId,
      client_service_name: serviceName,
      order_index: orderIndex,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create service: ${error.message}`);
  }

  return data as ClientService;
}

export async function updateClientService(
  serviceId: string,
  updates: {
    client_service_name?: string;
    order_index?: number;
  }
): Promise<ClientService> {
  const supabase = await createServerClient();
  
  const { data, error } = await supabase
    .from("client_services")
    .update(updates)
    .eq("client_service_id", serviceId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update service: ${error.message}`);
  }

  return data as ClientService;
}

export async function deleteClientService(serviceId: string): Promise<void> {
  const supabase = await createServerClient();
  
  const { error } = await supabase
    .from("client_services")
    .delete()
    .eq("client_service_id", serviceId);

  if (error) {
    throw new Error(`Failed to delete service: ${error.message}`);
  }
}

// Case Studies functions
export async function createCaseStudy(
  clientServiceId: string,
  caseData: {
    case_name: string;
    case_summary?: string;
    case_duration?: string;
    case_highlights: string;
    case_study_url?: string;
  }
): Promise<CaseStudy> {
  const supabase = await createServerClient();
  
  // Convert empty strings to null for nullable fields
  const insertData: any = {
    client_service_id: clientServiceId,
    case_name: caseData.case_name,
    case_highlights: caseData.case_highlights,
    case_summary: caseData.case_summary?.trim() || null,
    case_duration: caseData.case_duration?.trim() || null,
    case_study_url: caseData.case_study_url?.trim() || null,
  };
  
  const { data, error } = await supabase
    .from("case_studies")
    .insert(insertData)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create case study: ${error.message}`);
  }

  return data as CaseStudy;
}

export async function updateCaseStudy(
  caseId: string,
  updates: {
    case_name?: string;
    case_summary?: string;
    case_duration?: string;
    case_highlights?: string;
    case_study_url?: string;
  }
): Promise<CaseStudy> {
  const supabase = await createServerClient();
  
  // Convert empty strings to null for nullable fields
  const updateData: any = {};
  if (updates.case_name !== undefined) updateData.case_name = updates.case_name;
  if (updates.case_highlights !== undefined) updateData.case_highlights = updates.case_highlights;
  if (updates.case_summary !== undefined) {
    updateData.case_summary = updates.case_summary?.trim() || null;
  }
  if (updates.case_duration !== undefined) {
    updateData.case_duration = updates.case_duration?.trim() || null;
  }
  if (updates.case_study_url !== undefined) {
    updateData.case_study_url = updates.case_study_url?.trim() || null;
  }
  
  const { data, error } = await supabase
    .from("case_studies")
    .update(updateData)
    .eq("case_id", caseId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update case study: ${error.message}`);
  }

  return data as CaseStudy;
}

export async function deleteCaseStudy(caseId: string): Promise<void> {
  const supabase = await createServerClient();
  
  const { error } = await supabase
    .from("case_studies")
    .delete()
    .eq("case_id", caseId);

  if (error) {
    throw new Error(`Failed to delete case study: ${error.message}`);
  }
}

export async function createLead(
  leadData: {
  campaign_id: string;
  lead_name: string;
  lead_company: string;
  lead_email: string;
  lead_phone_isd?: string;
  lead_phone?: string;
  meeting_scheduled?: boolean;
  },
  supabaseClient?: Awaited<ReturnType<typeof createServerClient>>
) {
  // Use provided client (with session) or create server client
  // This allows anonymous users (with session) to insert leads
  const supabase = supabaseClient || await createServerClient();
  
  // Verify the campaign exists (RLS policy will check if user can see it)
  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .select("campaign_id")
    .eq("campaign_id", leadData.campaign_id)
    .single();

  if (campaignError || !campaign) {
    console.error("Campaign validation error:", campaignError);
    throw new Error(`Campaign not found: ${campaignError?.message || "Campaign does not exist"}`);
  }
  
  // Insert lead - RLS policy will check if user is anonymous and campaign exists
  const { data, error } = await supabase
    .from("leads")
    .insert([leadData])
    .select()
    .single();

  if (error) {
    console.error("Supabase error creating lead:", error);
    console.error("Lead data being inserted:", leadData);
    throw new Error(`Failed to create lead: ${error.message}`);
  }

  return data;
}

// Publish and Switch Campaign functions
export async function publishCampaign(
  projectId: string,
  campaignId: string
): Promise<{ success: boolean; message?: string; project_url?: string }> {
  const supabase = await createServerClient();
  
  const { data, error } = await supabase.rpc("publish_campaign", {
    p_project_id: projectId,
    p_campaign_id: campaignId,
  });

  if (error) {
    console.error("Error publishing campaign:", error);
    throw new Error(error.message || "Failed to publish campaign");
  }

  return data as { success: boolean; message?: string; project_url?: string };
}

export async function switchCampaign(
  projectId: string,
  targetCampaignId: string
): Promise<{ success: boolean; message?: string }> {
  const supabase = await createServerClient();
  
  const { data, error } = await supabase.rpc("switch_campaign", {
    p_project_id: projectId,
    p_target_campaign_id: targetCampaignId,
  });

  if (error) {
    console.error("Error switching campaign:", error);
    throw new Error(error.message || "Failed to switch campaign");
  }

  return data as { success: boolean; message?: string };
}

/**
 * Get all leads for a project (across all campaigns)
 * Returns leads with campaign names for display
 * Uses join to ensure RLS policies are properly applied
 */
export async function getLeadsByProjectId(
  projectId: string,
  page: number = 1,
  pageSize: number = 20
): Promise<{ leads: LeadData[]; total: number; page: number; pageSize: number }> {
  const supabase = await createServerClient();
  
  // First, verify project exists and get campaigns
  // This ensures RLS policies are applied correctly
  const { data: campaigns, error: campaignsError } = await supabase
    .from("campaigns")
    .select("campaign_id, campaign_name")
    .eq("project_id", projectId);

  if (campaignsError) {
    console.error("Error fetching campaigns:", campaignsError);
    throw new Error(`Failed to fetch campaigns: ${campaignsError.message}`);
  }

  if (!campaigns || campaigns.length === 0) {
    return { leads: [], total: 0, page, pageSize };
  }

  const campaignIds = campaigns.map((c) => c.campaign_id);
  const campaignNameMap = new Map(campaigns.map((c) => [c.campaign_id, c.campaign_name]));

  // Get total count
  const { count, error: countError } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .in("campaign_id", campaignIds);

  if (countError) {
    console.error("Error counting leads:", countError);
    throw new Error(`Failed to count leads: ${countError.message}`);
  }

  const total = count || 0;

  // Get paginated leads
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data: leads, error: leadsError } = await supabase
    .from("leads")
    .select("*")
    .in("campaign_id", campaignIds)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (leadsError) {
    console.error("Error fetching leads:", leadsError);
    throw new Error(`Failed to fetch leads: ${leadsError.message}`);
  }

  if (!leads) {
    return { leads: [], total, page, pageSize };
  }

  // Add campaign names to leads
  const leadsWithCampaignNames: LeadData[] = leads.map((lead) => ({
    ...lead,
    campaign_name: campaignNameMap.get(lead.campaign_id) || "Unknown Campaign",
  })) as LeadData[];

  return {
    leads: leadsWithCampaignNames,
    total,
    page,
    pageSize,
  };
}

