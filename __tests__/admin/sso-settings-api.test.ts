import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth
const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

// Mock system-setting-service
const mockGetSsoAutoCreateAccounts = vi.fn();
const mockSetSsoAutoCreateAccounts = vi.fn();
vi.mock("@/lib/services/system-setting-service", () => ({
  getSsoAutoCreateAccounts: (...args: unknown[]) =>
    mockGetSsoAutoCreateAccounts(...args),
  setSsoAutoCreateAccounts: (...args: unknown[]) =>
    mockSetSsoAutoCreateAccounts(...args),
}));

// Mock log-service (fire-and-forget, just ensure no errors)
vi.mock("@/lib/services/log-service", () => ({
  logAudit: vi.fn(),
  SETTING_CHANGED: "SETTING_CHANGED",
}));

import { GET, PUT } from "@/app/api/settings/sso/route";
import { NextRequest } from "next/server";

const adminSession = {
  user: {
    id: "admin-1",
    email: "admin@test.com",
    name: "Admin",
    role: "ADMIN",
  },
};
const userSession = {
  user: { id: "user-1", email: "user@test.com", name: "User", role: "USER" },
};

function makeRequest(body?: Record<string, unknown>): NextRequest {
  const opts: RequestInit = {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
  };
  if (body) opts.body = JSON.stringify(body);
  return new NextRequest("http://localhost/api/settings/sso", opts);
}

describe("Settings SSO API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(adminSession);
  });

  // --- GET /api/settings/sso ---
  describe("GET /api/settings/sso", () => {
    it("returns 401 without session", async () => {
      mockAuth.mockResolvedValue(null);
      const res = await GET();
      expect(res.status).toBe(401);
    });

    it("returns 403 for non-admin", async () => {
      mockAuth.mockResolvedValue(userSession);
      const res = await GET();
      expect(res.status).toBe(403);
    });

    it("returns autoCreateAccounts as false by default", async () => {
      mockGetSsoAutoCreateAccounts.mockResolvedValue(false);
      const res = await GET();
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.autoCreateAccounts).toBe(false);
    });

    it("returns autoCreateAccounts as true when enabled", async () => {
      mockGetSsoAutoCreateAccounts.mockResolvedValue(true);
      const res = await GET();
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.autoCreateAccounts).toBe(true);
    });

    it("returns 500 on unexpected error", async () => {
      mockGetSsoAutoCreateAccounts.mockRejectedValue(new Error("DB down"));
      const res = await GET();
      expect(res.status).toBe(500);
    });
  });

  // --- PUT /api/settings/sso ---
  describe("PUT /api/settings/sso", () => {
    it("returns 401 without session", async () => {
      mockAuth.mockResolvedValue(null);
      const res = await PUT(makeRequest({ autoCreateAccounts: true }));
      expect(res.status).toBe(401);
    });

    it("returns 403 for non-admin", async () => {
      mockAuth.mockResolvedValue(userSession);
      const res = await PUT(makeRequest({ autoCreateAccounts: true }));
      expect(res.status).toBe(403);
    });

    it("sets autoCreateAccounts to true", async () => {
      mockSetSsoAutoCreateAccounts.mockResolvedValue(undefined);
      const res = await PUT(makeRequest({ autoCreateAccounts: true }));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.autoCreateAccounts).toBe(true);
      expect(mockSetSsoAutoCreateAccounts).toHaveBeenCalledWith(true);
    });

    it("sets autoCreateAccounts to false", async () => {
      mockSetSsoAutoCreateAccounts.mockResolvedValue(undefined);
      const res = await PUT(makeRequest({ autoCreateAccounts: false }));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.autoCreateAccounts).toBe(false);
      expect(mockSetSsoAutoCreateAccounts).toHaveBeenCalledWith(false);
    });

    it("returns 400 for non-boolean value", async () => {
      const res = await PUT(makeRequest({ autoCreateAccounts: "yes" }));
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe(
        "Ungültiger Wert für automatische Kontoerstellung"
      );
    });

    it("returns 400 for missing autoCreateAccounts", async () => {
      const res = await PUT(makeRequest({}));
      expect(res.status).toBe(400);
    });

    it("returns 500 on unexpected error", async () => {
      mockSetSsoAutoCreateAccounts.mockRejectedValue(new Error("DB down"));
      const res = await PUT(makeRequest({ autoCreateAccounts: true }));
      expect(res.status).toBe(500);
    });
  });
});
