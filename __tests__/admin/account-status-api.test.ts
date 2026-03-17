import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth
const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

// Mock user-service
const mockSuspendUser = vi.fn();
const mockActivateUser = vi.fn();
const mockApproveUser = vi.fn();
const mockRejectUser = vi.fn();
vi.mock("@/lib/services/user-service", () => ({
  suspendUser: (...args: unknown[]) => mockSuspendUser(...args),
  activateUser: (...args: unknown[]) => mockActivateUser(...args),
  approveUser: (...args: unknown[]) => mockApproveUser(...args),
  rejectUser: (...args: unknown[]) => mockRejectUser(...args),
}));

import { PATCH } from "@/app/api/users/[id]/status/route";
import { POST as APPROVE } from "@/app/api/users/[id]/approve/route";
import { POST as REJECT } from "@/app/api/users/[id]/reject/route";
import { NextRequest } from "next/server";

const adminSession = {
  user: { id: "admin-1", email: "admin@test.com", name: "Admin", role: "ADMIN" },
};
const userSession = {
  user: { id: "user-1", email: "user@test.com", name: "User", role: "USER" },
};

function makeRequest(url: string, method: string, body?: Record<string, unknown>): NextRequest {
  const opts: RequestInit = { method, headers: { "Content-Type": "application/json" } };
  if (body) opts.body = JSON.stringify(body);
  return new NextRequest(`http://localhost${url}`, opts);
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

const sampleUser = {
  id: "user-2",
  email: "sample@test.com",
  name: "Sample",
  role: "USER",
  accountStatus: "SUSPENDED",
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("Account Status API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(adminSession);
  });

  // --- PATCH /api/users/[id]/status ---
  describe("PATCH /api/users/[id]/status", () => {
    it("returns 401 without session", async () => {
      mockAuth.mockResolvedValue(null);
      const req = makeRequest("/api/users/user-2/status", "PATCH", { status: "SUSPENDED" });
      const res = await PATCH(req, makeParams("user-2"));
      expect(res.status).toBe(401);
    });

    it("returns 403 for non-admin", async () => {
      mockAuth.mockResolvedValue(userSession);
      const req = makeRequest("/api/users/user-2/status", "PATCH", { status: "SUSPENDED" });
      const res = await PATCH(req, makeParams("user-2"));
      expect(res.status).toBe(403);
    });

    it("suspends a user successfully", async () => {
      mockSuspendUser.mockResolvedValue({ ...sampleUser, accountStatus: "SUSPENDED" });
      const req = makeRequest("/api/users/user-2/status", "PATCH", { status: "SUSPENDED" });
      const res = await PATCH(req, makeParams("user-2"));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.user.accountStatus).toBe("SUSPENDED");
    });

    it("activates a user successfully", async () => {
      mockActivateUser.mockResolvedValue({ ...sampleUser, accountStatus: "ACTIVE" });
      const req = makeRequest("/api/users/user-2/status", "PATCH", { status: "ACTIVE" });
      const res = await PATCH(req, makeParams("user-2"));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.user.accountStatus).toBe("ACTIVE");
    });

    it("returns 400 for invalid status value", async () => {
      const req = makeRequest("/api/users/user-2/status", "PATCH", { status: "INVALID" });
      const res = await PATCH(req, makeParams("user-2"));
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Ungültiger Kontostatus");
    });

    it("returns 403 when trying to suspend own account", async () => {
      mockSuspendUser.mockRejectedValue(new Error("Eigenes Konto kann nicht gesperrt werden"));
      const req = makeRequest("/api/users/admin-1/status", "PATCH", { status: "SUSPENDED" });
      const res = await PATCH(req, makeParams("admin-1"));
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toBe("Eigenes Konto kann nicht gesperrt werden");
    });

    it("returns 404 for non-existent user", async () => {
      mockSuspendUser.mockRejectedValue(new Error("Benutzer nicht gefunden"));
      const req = makeRequest("/api/users/non-existent/status", "PATCH", { status: "SUSPENDED" });
      const res = await PATCH(req, makeParams("non-existent"));
      expect(res.status).toBe(404);
    });

    it("returns 500 on unexpected error", async () => {
      mockSuspendUser.mockRejectedValue(new Error("DB down"));
      const req = makeRequest("/api/users/user-2/status", "PATCH", { status: "SUSPENDED" });
      const res = await PATCH(req, makeParams("user-2"));
      expect(res.status).toBe(500);
    });
  });

  // --- POST /api/users/[id]/approve ---
  describe("POST /api/users/[id]/approve", () => {
    it("returns 401 without session", async () => {
      mockAuth.mockResolvedValue(null);
      const req = makeRequest("/api/users/user-2/approve", "POST");
      const res = await APPROVE(req, makeParams("user-2"));
      expect(res.status).toBe(401);
    });

    it("returns 403 for non-admin", async () => {
      mockAuth.mockResolvedValue(userSession);
      const req = makeRequest("/api/users/user-2/approve", "POST");
      const res = await APPROVE(req, makeParams("user-2"));
      expect(res.status).toBe(403);
    });

    it("approves a user successfully", async () => {
      mockApproveUser.mockResolvedValue({ ...sampleUser, accountStatus: "ACTIVE" });
      const req = makeRequest("/api/users/user-2/approve", "POST");
      const res = await APPROVE(req, makeParams("user-2"));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.user.accountStatus).toBe("ACTIVE");
    });

    it("returns 404 for non-existent user", async () => {
      mockApproveUser.mockRejectedValue(new Error("Benutzer nicht gefunden"));
      const req = makeRequest("/api/users/non-existent/approve", "POST");
      const res = await APPROVE(req, makeParams("non-existent"));
      expect(res.status).toBe(404);
    });

    it("returns 500 on unexpected error", async () => {
      mockApproveUser.mockRejectedValue(new Error("DB down"));
      const req = makeRequest("/api/users/user-2/approve", "POST");
      const res = await APPROVE(req, makeParams("user-2"));
      expect(res.status).toBe(500);
    });
  });

  // --- POST /api/users/[id]/reject ---
  describe("POST /api/users/[id]/reject", () => {
    it("returns 401 without session", async () => {
      mockAuth.mockResolvedValue(null);
      const req = makeRequest("/api/users/user-2/reject", "POST");
      const res = await REJECT(req, makeParams("user-2"));
      expect(res.status).toBe(401);
    });

    it("returns 403 for non-admin", async () => {
      mockAuth.mockResolvedValue(userSession);
      const req = makeRequest("/api/users/user-2/reject", "POST");
      const res = await REJECT(req, makeParams("user-2"));
      expect(res.status).toBe(403);
    });

    it("rejects a user successfully", async () => {
      mockRejectUser.mockResolvedValue(undefined);
      const req = makeRequest("/api/users/user-2/reject", "POST");
      const res = await REJECT(req, makeParams("user-2"));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.message).toBe("Benutzer abgelehnt");
    });

    it("returns 404 for non-existent user", async () => {
      mockRejectUser.mockRejectedValue(new Error("Benutzer nicht gefunden"));
      const req = makeRequest("/api/users/non-existent/reject", "POST");
      const res = await REJECT(req, makeParams("non-existent"));
      expect(res.status).toBe(404);
    });

    it("returns 400 when rejecting non-pending user", async () => {
      mockRejectUser.mockRejectedValue(new Error("Nur ausstehende Benutzer können abgelehnt werden"));
      const req = makeRequest("/api/users/user-2/reject", "POST");
      const res = await REJECT(req, makeParams("user-2"));
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Nur ausstehende Benutzer können abgelehnt werden");
    });

    it("returns 500 on unexpected error", async () => {
      mockRejectUser.mockRejectedValue(new Error("DB down"));
      const req = makeRequest("/api/users/user-2/reject", "POST");
      const res = await REJECT(req, makeParams("user-2"));
      expect(res.status).toBe(500);
    });
  });
});
