import { createServerClient } from "@/lib/supabase/server";

export interface CampaignData {
  campaign_id: string;
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
}

export interface ClientService {
  client_service_id: string;
  client_service_name: string;
  order_index: number;
}

export interface CaseStudy {
  case_id: string;
  case_name: string;
  case_summary: string;
  case_duration: string;
  case_highlights: string;
  case_study_url: string;
}

export async function getCampaignById(campaignId: string): Promise<CampaignData | null> {
  const supabase = await createServerClient();
  
  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("campaign_id", campaignId)
    .eq("campaign_status", "ACTIVE")
    .single();

  if (error || !data) {
    return null;
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

