import { createServerClient } from "@/lib/supabase/server";

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

export async function createLead(leadData: {
  campaign_id: string;
  lead_name: string;
  lead_company: string;
  lead_email: string;
  lead_phone_isd?: string;
  lead_phone?: string;
  meeting_scheduled?: boolean;
}) {
  const supabase = await createServerClient();
  
  const { data, error } = await supabase
    .from("leads")
    .insert([leadData])
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create lead: ${error.message}`);
  }

  return data;
}

