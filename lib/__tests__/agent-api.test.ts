import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getAgentApiBaseUrl, agentRequest } from "../agent-api";

const originalEnv = { ...process.env };

describe("agent-api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.PLT_SERVER_BASE_URL;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  describe("getAgentApiBaseUrl", () => {
    it("returns base URL + /api/v1 when PLT_SERVER_BASE_URL is set", () => {
      process.env.PLT_SERVER_BASE_URL = "https://agent.example.com";
      expect(getAgentApiBaseUrl()).toBe("https://agent.example.com/api/v1");
    });

    it("strips trailing slash from PLT_SERVER_BASE_URL", () => {
      process.env.PLT_SERVER_BASE_URL = "https://agent.example.com/";
      expect(getAgentApiBaseUrl()).toBe("https://agent.example.com/api/v1");
    });

    it("falls back to http://localhost:8000 when PLT_SERVER_BASE_URL is unset", () => {
      expect(getAgentApiBaseUrl()).toBe("http://localhost:8000/api/v1");
    });

    it("falls back when PLT_SERVER_BASE_URL is empty string", () => {
      process.env.PLT_SERVER_BASE_URL = "";
      expect(getAgentApiBaseUrl()).toBe("http://localhost:8000/api/v1");
    });
  });

  describe("agentRequest", () => {
    it("sends Authorization: Bearer <JWT> header", async () => {
      const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEyMyJ9.x";
      const mockRes = new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(mockRes);

      await agentRequest({
        accessToken: token,
        method: "GET",
        path: "resumes",
      });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, init] = fetchSpy.mock.calls[0];
      expect(init).toBeDefined();
      const headers = init?.headers as HeadersInit;
      const headerObj = headers instanceof Headers ? Object.fromEntries((headers as Headers).entries()) : (headers as Record<string, string>);
      expect(headerObj.Authorization).toBe(`Bearer ${token}`);
    });

    it("constructs URL from base + /api/v1 + path (path without leading slash)", async () => {
      process.env.PLT_SERVER_BASE_URL = "https://agent.example.com";
      const mockRes = new Response(JSON.stringify({ resumes: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(mockRes);

      await agentRequest({
        accessToken: "jwt-token",
        method: "GET",
        path: "resumes",
      });

      expect(fetchSpy).toHaveBeenCalledWith(
        "https://agent.example.com/api/v1/resumes",
        expect.any(Object)
      );
    });

    it("constructs URL correctly when path has leading slash", async () => {
      process.env.PLT_SERVER_BASE_URL = "https://agent.example.com";
      const mockRes = new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(mockRes);

      await agentRequest({
        accessToken: "jwt",
        method: "GET",
        path: "/tasks/abc-123",
      });

      expect(fetchSpy).toHaveBeenCalledWith(
        "https://agent.example.com/api/v1/tasks/abc-123",
        expect.any(Object)
      );
    });

    it("sends JSON body and Content-Type when body is object", async () => {
      const mockRes = new Response(JSON.stringify({ task_id: "t1" }), {
        status: 202,
        headers: { "Content-Type": "application/json" },
      });
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(mockRes);

      await agentRequest({
        accessToken: "jwt",
        method: "POST",
        path: "/tasks/resume-scoring",
        body: { jd_source_type: "paste", jd_text: "Senior PM..." },
      });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [, init] = fetchSpy.mock.calls[0];
      const headers = init?.headers as Record<string, string>;
      expect(headers["Content-Type"]).toBe("application/json");
      expect(headers.Authorization).toBe("Bearer jwt");
      expect(init?.body).toBe(JSON.stringify({ jd_source_type: "paste", jd_text: "Senior PM..." }));
    });

    it("uses provided method and preserves Authorization when custom headers passed", async () => {
      const mockRes = new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(mockRes);

      await agentRequest({
        accessToken: "secret-jwt",
        method: "DELETE",
        path: "resumes/uuid-123",
        headers: { "X-Custom": "value" },
      });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [, init] = fetchSpy.mock.calls[0];
      const headers = init?.headers as Record<string, string>;
      expect(init?.method).toBe("DELETE");
      expect(headers.Authorization).toBe("Bearer secret-jwt");
      expect(headers["X-Custom"]).toBe("value");
    });
  });
});
