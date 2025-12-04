import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ widgetId: string }> }
) {
  try {
    const { widgetId } = await params;
    const supabase = createServerClient();

    // Fetch widget configuration with project URL
    const { data: widget, error } = await supabase
      .from("widgets")
      .select(`
        widget_id,
        campaign_id,
        widget_name,
        is_active,
        widget_text,
        design_attributes,
        campaigns!inner(
          campaign_status,
          project_id,
          projects!inner(project_url, is_archived)
        )
      `)
      .eq("widget_id", widgetId)
      .single();

    if (error || !widget) {
      return NextResponse.json(
        { error: "Widget not found" },
        { status: 404 }
      );
    }

    // Only return widget if campaign is active and project is not archived
    const campaign = widget.campaigns as any;
    const project = campaign.projects as any;
    
    if (campaign.campaign_status !== "ACTIVE" || project.is_archived) {
      return NextResponse.json(
        { error: "Campaign is not active or project is archived" },
        { status: 400 }
      );
    }

    // Return widget configuration with project URL
    return NextResponse.json({
      widget_id: widget.widget_id,
      campaign_id: widget.campaign_id,
      is_active: widget.is_active,
      widget_text: widget.widget_text,
      destination_url: project.project_url,
      design: widget.design_attributes,
    });
  } catch (error) {
    console.error("Error fetching widget:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

