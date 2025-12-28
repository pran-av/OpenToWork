import { NextResponse } from "next/server";

/**
 * Adds public cache headers for non-user-specific GET requests
 * Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400
 * 
 * Use for public data that can be cached at edge nodes and shared across users
 * 
 * @param response - NextResponse object to add headers to
 * @returns NextResponse with cache headers
 */
export function addPublicCacheHeaders(response: NextResponse): NextResponse {
  response.headers.set(
    "Cache-Control",
    "public, s-maxage=3600, stale-while-revalidate=86400"
  );
  return response;
}

/**
 * Adds private cache headers for user-specific GET requests
 * Cache-Control: private, s-maxage=0, max-age=60
 * 
 * Use for authenticated user-specific data that should only be cached in browser
 * 
 * @param response - NextResponse object to add headers to
 * @returns NextResponse with cache headers
 */
export function addPrivateCacheHeaders(response: NextResponse): NextResponse {
  response.headers.set(
    "Cache-Control",
    "private, s-maxage=0, max-age=60"
  );
  return response;
}

/**
 * Adds no-store cache headers for auth routes and sensitive data
 * Cache-Control: no-store, must-revalidate
 * 
 * Use for authentication routes and sensitive operations
 * 
 * @param response - NextResponse object to add headers to
 * @returns NextResponse with cache headers
 */
export function addNoStoreCacheHeaders(response: NextResponse): NextResponse {
  response.headers.set(
    "Cache-Control",
    "no-store, must-revalidate"
  );
  return response;
}

/**
 * Creates a cached JSON response for public/non-user-specific data
 * Use this for GET requests that return public data
 * 
 * @param data - Data to return in response
 * @param status - HTTP status code (default: 200)
 * @returns NextResponse with public cache headers and JSON data
 */
export function cachedPublicJsonResponse<T>(
  data: T,
  status: number = 200
): NextResponse {
  const response = NextResponse.json(data, { status });
  return addPublicCacheHeaders(response);
}

/**
 * Creates a cached JSON response for user-specific authenticated data
 * Use this for GET requests that return user-specific data
 * 
 * @param data - Data to return in response
 * @param status - HTTP status code (default: 200)
 * @returns NextResponse with private cache headers and JSON data
 */
export function cachedPrivateJsonResponse<T>(
  data: T,
  status: number = 200
): NextResponse {
  const response = NextResponse.json(data, { status });
  return addPrivateCacheHeaders(response);
}

/**
 * Creates a no-store JSON response for auth routes and sensitive operations
 * Use this for authentication routes and sensitive data
 * 
 * @param data - Data to return in response
 * @param status - HTTP status code (default: 200)
 * @returns NextResponse with no-store cache headers and JSON data
 */
export function noStoreJsonResponse<T>(
  data: T,
  status: number = 200
): NextResponse {
  const response = NextResponse.json(data, { status });
  return addNoStoreCacheHeaders(response);
}
