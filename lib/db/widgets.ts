import { createServerClient } from "@/lib/supabase/server";

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
  const supabase = createServerClient();

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

