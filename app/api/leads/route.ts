import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createLead } from "@/lib/db/campaigns";

export async function POST(request: NextRequest) {
  try {
    // Get the session from the request (will include anonymous users)
    const supabase = await createServerClient();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    // Log session details for debugging
    if (sessionError) {
      console.error("[API /leads] Error getting session:", sessionError);
    }
    
    if (session) {
      console.log("[API /leads] Session found:", {
        user_id: session.user?.id,
        email: session.user?.email,
        is_anonymous: session.user?.is_anonymous,
        access_token: session.access_token ? "present" : "missing",
        expires_at: session.expires_at,
      });
      
      // Decode JWT to check is_anonymous claim
      try {
        const jwtPayload = JSON.parse(Buffer.from(session.access_token.split('.')[1], 'base64').toString());
        console.log("[API /leads] JWT payload:", {
          sub: jwtPayload.sub,
          email: jwtPayload.email,
          is_anonymous: jwtPayload.is_anonymous,
          role: jwtPayload.role,
          exp: jwtPayload.exp,
        });
        
        if (jwtPayload.is_anonymous !== true) {
          console.warn("[API /leads] WARNING: is_anonymous claim is not true in JWT!");
        }
      } catch (jwtError) {
        console.error("[API /leads] Error decoding JWT:", jwtError);
      }
    } else {
      console.warn("[API /leads] No session found");
    }
    
    // Verify user is authenticated (either anonymous or permanent)
    if (!session) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

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

    // Use server client (with session) instead of public client
    const lead = await createLead(sanitizedData, supabase);

    return NextResponse.json({ success: true, lead }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating lead:", error);
    return NextResponse.json(
      { 
        error: "Failed to create lead",
        details: error?.message || String(error)
      },
      { status: 500 }
    );
  }
}

