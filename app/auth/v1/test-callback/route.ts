import { NextRequest, NextResponse } from "next/server";

/**
 * Simple test endpoint to verify route handlers are working in production
 * Access at: /auth/v1/test-callback
 */
export async function GET(request: NextRequest) {
  const response = NextResponse.json({
    message: "Test endpoint is working",
    timestamp: new Date().toISOString(),
    url: request.url,
    pathname: request.nextUrl.pathname,
  });
  
  response.headers.set("X-Debug-Test", "working");
  response.headers.set("X-Debug-RouteExecuted", "yes");
  
  console.error("[TEST ENDPOINT] /auth/v1/test-callback was called", {
    url: request.url,
    timestamp: new Date().toISOString(),
  });
  
  return response;
}

