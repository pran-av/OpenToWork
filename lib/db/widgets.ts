import { createServerClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/server";

export interface WidgetData {
  widget_id: string;
  campaign_id: string;
  widget_name: string;
  is_active: boolean;
  widget_text: string;
  design_attributes: {
    asset_type: string;
    color_primary: string;
    color_secondary: string;
    custom_icon_url?: string | null;
    custom_css?: string;
  };
}

export async function getWidgetByCampaignId(
  campaignId: string
): Promise<WidgetData | null> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("widgets")
    .select("*")
    .eq("campaign_id", campaignId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  return data as WidgetData;
}

/**
 * Get widget by campaign ID (public, no auth required)
 * Used for public campaign pages
 * @deprecated Use getWidgetByProjectIdPublic instead for better security
 */
export async function getWidgetByCampaignIdPublic(
  campaignId: string
): Promise<WidgetData | null> {
  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from("widgets")
    .select("*")
    .eq("campaign_id", campaignId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  return data as WidgetData;
}

/**
 * Get widget by project ID (public, no auth required)
 * Used for public project pages
 * Uses RPC function to ensure project_id is mandatory
 */
export async function getWidgetByProjectIdPublic(
  projectId: string
): Promise<WidgetData | null> {
  const supabase = createPublicClient();

  const { data, error } = await supabase.rpc("get_widgets_by_project", {
    p_project_id: projectId,
  });

  if (error || !data || data.length === 0) {
    return null;
  }

  // Filter for active widgets and return the most recent one
  const activeWidgets = data.filter((w: any) => w.is_active === true);
  if (activeWidgets.length === 0) {
    return null;
  }

  // Sort by created_at and return the most recent
  activeWidgets.sort((a: any, b: any) => {
    const dateA = new Date(a.created_at).getTime();
    const dateB = new Date(b.created_at).getTime();
    return dateB - dateA;
  });

  return activeWidgets[0] as WidgetData;
}

