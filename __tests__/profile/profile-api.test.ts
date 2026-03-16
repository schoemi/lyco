import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth
const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

// Mock profil-service
const mockGetProfile = vi.fn();
const mockUpdateProfile = vi.fn();
const mockChangePassword = vi.fn();
vi.mock("@/lib/services/profil-service", () => ({
  getProfile: (...args: unknown[]) => mockGetProfile(...args),
  updateProfile: (...args: unknown[]) => mockUpdateProfile(...args),
  changePassword: (...args: unknown[]) => mockChangePassword(...args),
}));

import { GET, PUT } from "@/app/api/profile/route";
import { PUT as PUT_PASSWORD } from "@/app/api/profile/password/route";
import { NextRequest } from "next/server";

const userSession = {
  user: { id: "user-1", email: "test@example.com", name: "Test", role: "USER" },
};

const sampleProfile = {
  id: "user-1",
  name: "Test User",
  email: "test@example.com",
  alter: 30,
  geschlecht: "MAENNLICH",
  erfahrungslevel: "ANFAENGER",
  stimmlage: "Tenor",
  genre: "Rock",
};

function makeRequest(url: string, method: string, body?: Record<string, unknown>): NextRequest {
  const opts: RequestInit = { method, headers: { "Content-Type": "application/json" } };
  if (body) opts.body = JSON.stringify(body);
  return new NextRequest(`http://localhost${url}`, opts);
}

describe("Profile API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(userSession);
  });

  // --- GET /api/profile ---
  describe("GET /api/profile", () => {
    it("returns 401 without session", async () => {
      mockAuth.mockResolvedValue(null);
      const res = await GET();
      expect(res.status).toBe(401);
    });

    it("returns profile data on success", async () => {
      mockGetProfile.mockResolvedValue(sampleProfile);
      const res = await GET();
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.profile).toEqual(sampleProfile);
    });

    it("returns 500 on unexpected error", async () => {
      mockGetProfile.mockRejectedValue(new Error("DB down"));
      const res = await GET();
      expect(res.status).toBe(500);
    });
  });

  // --- PUT /api/profile ---
  describe("PUT /api/profile", () => {
    it("returns 401 without session", async () => {
      mockAuth.mockResolvedValue(null);
      const req = makeRequest("/api/profile", "PUT", { name: "New Name" });
      const res = await PUT(req);
      expect(res.status).toBe(401);
    });

    it("updates profile on success", async () => {
      const updated = { ...sampleProfile, name: "Updated" };
      mockUpdateProfile.mockResolvedValue(updated);
      const req = makeRequest("/api/profile", "PUT", { name: "Updated" });
      const res = await PUT(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.profile.name).toBe("Updated");
    });

    it("returns 400 for validation error (empty name)", async () => {
      mockUpdateProfile.mockRejectedValue(new Error("Name darf nicht leer sein"));
      const req = makeRequest("/api/profile", "PUT", { name: "" });
      const res = await PUT(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Name darf nicht leer sein");
    });

    it("returns 400 for validation error (invalid alter)", async () => {
      mockUpdateProfile.mockRejectedValue(
        new Error("Alter muss eine Ganzzahl zwischen 1 und 120 sein")
      );
      const req = makeRequest("/api/profile", "PUT", { alter: 200 });
      const res = await PUT(req);
      expect(res.status).toBe(400);
    });

    it("returns 500 on unexpected error", async () => {
      mockUpdateProfile.mockRejectedValue(new Error("Unexpected"));
      const req = makeRequest("/api/profile", "PUT", { name: "Test" });
      const res = await PUT(req);
      expect(res.status).toBe(500);
    });
  });

  // --- PUT /api/profile/password ---
  describe("PUT /api/profile/password", () => {
    it("returns 401 without session", async () => {
      mockAuth.mockResolvedValue(null);
      const req = makeRequest("/api/profile/password", "PUT", {
        currentPassword: "old",
        newPassword: "newpass123",
        confirmPassword: "newpass123",
      });
      const res = await PUT_PASSWORD(req);
      expect(res.status).toBe(401);
    });

    it("returns success on valid password change", async () => {
      mockChangePassword.mockResolvedValue(undefined);
      const req = makeRequest("/api/profile/password", "PUT", {
        currentPassword: "oldPassword1",
        newPassword: "newPassword1",
        confirmPassword: "newPassword1",
      });
      const res = await PUT_PASSWORD(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });

    it("returns 400 when passwords do not match", async () => {
      mockChangePassword.mockRejectedValue(
        new Error("Passwörter stimmen nicht überein")
      );
      const req = makeRequest("/api/profile/password", "PUT", {
        currentPassword: "oldPassword1",
        newPassword: "newPassword1",
        confirmPassword: "different",
      });
      const res = await PUT_PASSWORD(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Passwörter stimmen nicht überein");
    });

    it("returns 400 when current password is wrong", async () => {
      mockChangePassword.mockRejectedValue(
        new Error("Aktuelles Passwort ist falsch")
      );
      const req = makeRequest("/api/profile/password", "PUT", {
        currentPassword: "wrongPassword",
        newPassword: "newPassword1",
        confirmPassword: "newPassword1",
      });
      const res = await PUT_PASSWORD(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Aktuelles Passwort ist falsch");
    });

    it("returns 500 on unexpected error", async () => {
      mockChangePassword.mockRejectedValue(new Error("Unexpected"));
      const req = makeRequest("/api/profile/password", "PUT", {
        currentPassword: "old",
        newPassword: "newpass123",
        confirmPassword: "newpass123",
      });
      const res = await PUT_PASSWORD(req);
      expect(res.status).toBe(500);
    });
  });
});
