import { NextRequest, NextResponse } from "next/server";
import { createLead } from "@/lib/db/campaigns";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      campaign_id,
      lead_name,
      lead_company,
      lead_email,
      lead_phone_isd,
      lead_phone,
      meeting_scheduled,
    } = body;

    // Validate required fields
    if (!campaign_id || !lead_name || !lead_company || !lead_email) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Sanitize inputs
    const sanitizedData = {
      campaign_id: String(campaign_id).trim(),
      lead_name: String(lead_name).trim(),
      lead_company: String(lead_company).trim(),
      lead_email: String(lead_email).trim().toLowerCase(),
      lead_phone_isd: lead_phone_isd ? String(lead_phone_isd).trim() : undefined,
      lead_phone: lead_phone ? String(lead_phone).trim() : undefined,
      meeting_scheduled: Boolean(meeting_scheduled),
    };

    const lead = await createLead(sanitizedData);

    return NextResponse.json({ success: true, lead }, { status: 201 });
  } catch (error) {
    console.error("Error creating lead:", error);
    return NextResponse.json(
      { error: "Failed to create lead" },
      { status: 500 }
    );
  }
}

