/**
 * PLT Agent Service API – server-side proxy helpers.
 * Base URL resolution order:
 * 1) PLT_SERVER_BASE_URL (all environments, explicit override)
 * 2) Production default: https://agentservice.pitchlikethis.com
 * 3) Local fallback: http://localhost:8000
 * All requests forward the Supabase session JWT (Bearer).
 */

const PRODUCTION_BASE_URL = "https://agentservice.pitchlikethis.com";
const LOCAL_FALLBACK_BASE_URL = "http://localhost:8000";

const getBaseUrl = (): string => {
  if (typeof process.env.PLT_SERVER_BASE_URL === "string" && process.env.PLT_SERVER_BASE_URL) {
    return process.env.PLT_SERVER_BASE_URL.replace(/\/$/, "");
  }

  const isProduction =
    process.env.ENVIRONMENT === "production" || process.env.NODE_ENV === "production";
  if (isProduction) {
    return PRODUCTION_BASE_URL;
  }

  console.error(
    "[agent-api] PLT_SERVER_BASE_URL is not set; falling back to http://localhost:8000"
  );
  return LOCAL_FALLBACK_BASE_URL;
};

const API_PREFIX = "/api/v1";

export function getAgentApiBaseUrl(): string {
  return getBaseUrl() + API_PREFIX;
}

export interface AgentRequestOptions {
  accessToken: string;
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  body?: Record<string, unknown> | FormData;
  headers?: Record<string, string>;
  apiPrefix?: "/api/v1" | "/api/v2";
}

/**
 * Forwards a request to the Agent Service with Bearer token.
 * path should be e.g. "/resumes" or "/tasks/resume-scoring" (no leading slash on path is ok).
 */
export async function agentRequest<T = unknown>(options: AgentRequestOptions): Promise<{
  ok: boolean;
  status: number;
  data: T | { detail?: string | unknown };
}> {
  const base = getBaseUrl();
  const apiPrefix = options.apiPrefix ?? API_PREFIX;
  const path = options.path.startsWith("/") ? options.path : `/${options.path}`;
  const url = `${base}${apiPrefix}${path}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${options.accessToken}`,
    ...options.headers,
  };

  let body: BodyInit | undefined;
  if (options.body !== undefined) {
    if (options.body instanceof FormData) {
      body = options.body;
      // Do not set Content-Type; browser will set multipart boundary
      delete headers["Content-Type"];
    } else {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(options.body);
    }
  }

  const res = await fetch(url, {
    method: options.method,
    headers,
    body,
  });

  const contentType = res.headers.get("content-type") ?? "";
  let data: T | { detail?: string | unknown };
  if (contentType.includes("application/json")) {
    data = (await res.json()) as T | { detail?: string | unknown };
  } else {
    data = { detail: await res.text() };
  }

  return { ok: res.ok, status: res.status, data };
}
