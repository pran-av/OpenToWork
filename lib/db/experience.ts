import { createServerClient, createPublicClient } from "@/lib/supabase/server";

export interface ServiceClassData {
  service_class_id: string;
  user_id: string;
  service_class_name: string;
  is_system_default: boolean;
  preset: string | null;
  is_archived: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExperienceCaseStudyData {
  case_id: string;
  service_class_id: string;
  case_name: string;
  case_summary: string | null;
  case_duration: string | null;
  display_year: number;
  case_highlights: string;
  case_study_url: string | null;
  is_archived: boolean;
  archived_at: string | null;
  ai_opt_in: boolean;
  vector_status: string;
  vector_updated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExperienceCaseStudyWithService extends ExperienceCaseStudyData {
  service_class_name: string;
}

export interface AttachedExperienceCaseStudy {
  case_id: string;
  attached_service_class_id: string | null;
  service_class_name: string;
  case_name: string;
  case_summary: string | null;
  case_duration: string | null;
  display_year: number;
  case_highlights: string;
  case_study_url: string | null;
  created_at: string;
  order_index: number;
}

export async function getServiceClasses(): Promise<ServiceClassData[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase.rpc("get_experience_service_classes");

  if (error || !data) return [];
  return data as ServiceClassData[];
}

export async function createServiceClass(serviceClassName: string): Promise<ServiceClassData> {
  const supabase = await createServerClient();
  const { data, error } = await supabase.rpc("create_experience_service_class", {
    p_service_class_name: serviceClassName.trim(),
  });

  if (error || !data || data.length === 0) {
    throw new Error(error?.message || "Failed to create service class");
  }

  return data[0] as ServiceClassData;
}

export async function getExperienceCaseStudiesForUser(): Promise<ExperienceCaseStudyWithService[]> {
  const supabase = await createServerClient();
  const { data: caseStudies, error } = await supabase.rpc("get_experience_case_studies");

  if (error || !caseStudies) {
    return [];
  }

  return caseStudies as ExperienceCaseStudyWithService[];
}

export async function createExperienceCaseStudy(input: {
  service_class_id: string;
  case_name: string;
  case_summary?: string;
  case_duration?: string | null;
  display_year: number;
  case_highlights: string;
  case_study_url?: string;
}): Promise<ExperienceCaseStudyData> {
  const supabase = await createServerClient();

  const durationTrimmed = input.case_duration?.trim() ?? "";
  const { data, error } = await supabase.rpc("create_experience_case_study", {
    p_service_class_id: input.service_class_id,
    p_case_name: input.case_name.trim(),
    p_case_summary: input.case_summary?.trim() || null,
    p_case_duration: durationTrimmed.length > 0 ? durationTrimmed : null,
    p_display_year: input.display_year,
    p_case_highlights: input.case_highlights.trim(),
    p_case_study_url: input.case_study_url?.trim() || null,
  });

  if (error || !data || data.length === 0) {
    throw new Error(error?.message || "Failed to create case study");
  }

  return data[0] as ExperienceCaseStudyData;
}

export async function updateExperienceCaseStudy(
  caseId: string,
  updates: {
    case_name?: string;
    case_summary?: string;
    case_duration?: string;
    display_year?: number;
    case_highlights?: string;
    case_study_url?: string;
    is_archived?: boolean;
  }
): Promise<ExperienceCaseStudyData> {
  const supabase = await createServerClient();

  const { data, error } = await supabase.rpc("update_experience_case_study", {
    p_case_id: caseId,
    p_case_name: updates.case_name?.trim() ?? null,
    p_case_summary: updates.case_summary?.trim() ?? null,
    p_case_duration: updates.case_duration?.trim() ?? null,
    p_display_year: updates.display_year ?? null,
    p_case_highlights: updates.case_highlights?.trim() ?? null,
    p_case_study_url: updates.case_study_url?.trim() ?? null,
    p_is_archived: updates.is_archived ?? null,
  });

  if (error || !data || data.length === 0) {
    throw new Error(error?.message || "Failed to update case study");
  }

  return data[0] as ExperienceCaseStudyData;
}

export async function searchExperienceCaseStudiesByTitle(
  query: string,
  limit: number = 20
): Promise<ExperienceCaseStudyWithService[]> {
  const supabase = await createServerClient();
  const { data: caseStudies, error } = await supabase.rpc("search_experience_case_studies", {
    p_query: query.trim(),
    p_limit: limit,
  });
  if (error || !caseStudies) return [];

  return caseStudies as ExperienceCaseStudyWithService[];
}

export async function attachExperienceCaseStudyToCampaign(input: {
  campaign_id: string;
  case_id: string;
  attached_service_class_id?: string;
  order_index?: number;
}): Promise<void> {
  const supabase = await createServerClient();

  const { error } = await supabase.rpc("attach_experience_case_study_to_campaign", {
    p_campaign_id: input.campaign_id,
    p_case_id: input.case_id,
    p_attached_service_class_id: input.attached_service_class_id || null,
    p_order_index: input.order_index ?? 0,
  });

  if (error) {
    throw new Error(error.message || "Failed to attach case study");
  }
}

export async function getAttachedExperienceCaseStudiesForCampaign(
  campaignId: string
): Promise<AttachedExperienceCaseStudy[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc("get_attached_experience_case_studies_for_campaign", {
    p_campaign_id: campaignId,
  });

  if (error || !data) {
    return [];
  }

  return data as AttachedExperienceCaseStudy[];
}
