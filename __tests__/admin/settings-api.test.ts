import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth
const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

// Mock system-setting-service
const mockGetRequireApproval = vi.fn();
const mockSetRequireApproval = vi.fn();
vi.mock("@/lib/services/system-setting-service", () => ({
  getRequireApproval: (...args: unknown[]) => mockGetRequireApproval(...args),
  setRequireApproval: (...args: unknown[]) => mockSetRequireApproval(...args),
}));

import { GET, PUT } from "@/app/api/settings/require-approval/route";
import { NextRequest } from "next/server";

const adminSession = {
  user: { id: "admin-1", email: "admin@test.com", name: "Admin", role: "ADMIN" },
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
  return new NextRequest("http://localhost/api/settings/require-approval", opts);
}

describe("Settings Require-Approval API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(adminSession);
  });

  // --- GET /api/settings/require-approval ---
  describe("GET /api/settings/require-approval", () => {
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

    it("returns the current value (false by default)", async () => {
      mockGetRequireApproval.mockResolvedValue(false);
      const res = await GET();
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.value).toBe(false);
    });

    it("returns the current value (true when enabled)", async () => {
      mockGetRequireApproval.mockResolvedValue(true);
      const res = await GET();
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.value).toBe(true);
    });

    it("returns 500 on unexpected error", async () => {
      mockGetRequireApproval.mockRejectedValue(new Error("DB down"));
      const res = await GET();
      expect(res.status).toBe(500);
    });
  });

  // --- PUT /api/settings/require-approval ---
  describe("PUT /api/settings/require-approval", () => {
    it("returns 401 without session", async () => {
      mockAuth.mockResolvedValue(null);
      const res = await PUT(makeRequest({ value: true }));
      expect(res.status).toBe(401);
    });

    it("returns 403 for non-admin", async () => {
      mockAuth.mockResolvedValue(userSession);
      const res = await PUT(makeRequest({ value: true }));
      expect(res.status).toBe(403);
    });

    it("sets value to true", async () => {
      mockSetRequireApproval.mockResolvedValue(undefined);
      const res = await PUT(makeRequest({ value: true }));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.value).toBe(true);
      expect(mockSetRequireApproval).toHaveBeenCalledWith(true);
    });

    it("sets value to false", async () => {
      mockSetRequireApproval.mockResolvedValue(undefined);
      const res = await PUT(makeRequest({ value: false }));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.value).toBe(false);
      expect(mockSetRequireApproval).toHaveBeenCalledWith(false);
    });

    it("returns 400 for non-boolean value", async () => {
      const res = await PUT(makeRequest({ value: "yes" }));
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Ungültiger Wert für Bestätigungspflicht");
    });

    it("returns 400 for missing value", async () => {
      const res = await PUT(makeRequest({}));
      expect(res.status).toBe(400);
    });

    it("returns 500 on unexpected error", async () => {
      mockSetRequireApproval.mockRejectedValue(new Error("DB down"));
      const res = await PUT(makeRequest({ value: true }));
      expect(res.status).toBe(500);
    });
  });
});
