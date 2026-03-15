import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth
const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/lib/services/auth-service", () => ({
  hashPassword: vi.fn(async (pw: string) => `hashed_${pw}`),
  validateEmail: vi.fn((email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)),
  validatePassword: vi.fn((pw: string) => {
    if (pw.length < 8) return { valid: false, error: "Passwort muss mindestens 8 Zeichen lang sein" };
    return { valid: true };
  }),
}));

vi.mock("@/lib/services/rate-limiter", () => ({
  checkRateLimit: vi.fn(),
  recordFailedAttempt: vi.fn(),
  resetAttempts: vi.fn(),
}));

import { GET, POST } from "@/app/api/users/route";
import { PUT, DELETE } from "@/app/api/users/[id]/route";
import { POST as RESET_PASSWORD } from "@/app/api/users/[id]/reset-password/route";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

const mockPrisma = vi.mocked(prisma);

const now = new Date();
const adminSession = {
  user: { id: "admin-1", email: "admin@test.com", name: "Admin", role: "ADMIN" },
};
const userSession = {
  user: { id: "user-1", email: "user@test.com", name: "User", role: "USER" },
};

const sampleUser = {
  id: "user-2",
  email: "sample@test.com",
  name: "Sample",
  role: "USER" as const,
  createdAt: now,
  updatedAt: now,
};

function makeRequest(url: string, method: string, body?: Record<string, unknown>): NextRequest {
  const opts: RequestInit = { method, headers: { "Content-Type": "application/json" } };
  if (body) opts.body = JSON.stringify(body);
  return new NextRequest(`http://localhost${url}`, opts);
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("Admin User API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(adminSession);
  });

  // --- Auth checks (apply to all endpoints) ---
  describe("Auth checks", () => {
    it("GET /api/users returns 401 without session", async () => {
      mockAuth.mockResolvedValue(null);
      const res = await GET();
      expect(res.status).toBe(401);
    });

    it("GET /api/users returns 403 for non-admin", async () => {
      mockAuth.mockResolvedValue(userSession);
      const res = await GET();
      expect(res.status).toBe(403);
    });

    it("POST /api/users returns 401 without session", async () => {
      mockAuth.mockResolvedValue(null);
      const req = makeRequest("/api/users", "POST", { email: "a@b.com", password: "12345678" });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it("PUT /api/users/[id] returns 401 without session", async () => {
      mockAuth.mockResolvedValue(null);
      const req = makeRequest("/api/users/user-2", "PUT", { name: "X" });
      const res = await PUT(req, makeParams("user-2"));
      expect(res.status).toBe(401);
    });

    it("DELETE /api/users/[id] returns 403 for non-admin", async () => {
      mockAuth.mockResolvedValue(userSession);
      const req = makeRequest("/api/users/user-2", "DELETE");
      const res = await DELETE(req, makeParams("user-2"));
      expect(res.status).toBe(403);
    });

    it("POST /api/users/[id]/reset-password returns 401 without session", async () => {
      mockAuth.mockResolvedValue(null);
      const req = makeRequest("/api/users/user-2/reset-password", "POST");
      const res = await RESET_PASSWORD(req, makeParams("user-2"));
      expect(res.status).toBe(401);
    });
  });

  // --- GET /api/users ---
  describe("GET /api/users", () => {
    it("returns list of users", async () => {
      mockPrisma.user.findMany.mockResolvedValue([sampleUser]);
      const res = await GET();
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.users).toHaveLength(1);
      expect(json.users[0].email).toBe("sample@test.com");
    });

    it("returns 500 on unexpected error", async () => {
      mockPrisma.user.findMany.mockRejectedValue(new Error("DB down"));
      const res = await GET();
      expect(res.status).toBe(500);
    });
  });

  // --- POST /api/users ---
  describe("POST /api/users", () => {
    it("creates user with valid data", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null); // email not taken
      mockPrisma.user.create.mockResolvedValue(sampleUser as any);

      const req = makeRequest("/api/users", "POST", {
        email: "new@test.com",
        name: "New User",
        password: "securepass",
        role: "USER",
      });
      const res = await POST(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.user).toBeDefined();
    });

    it("returns 400 for invalid email", async () => {
      const req = makeRequest("/api/users", "POST", {
        email: "invalid",
        password: "12345678",
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.field).toBe("email");
    });

    it("returns 400 for short password", async () => {
      const req = makeRequest("/api/users", "POST", {
        email: "valid@test.com",
        password: "short",
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.field).toBe("password");
    });

    it("returns 400 for invalid role", async () => {
      const req = makeRequest("/api/users", "POST", {
        email: "valid@test.com",
        password: "12345678",
        role: "SUPERADMIN",
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.field).toBe("role");
    });

    it("returns 409 for duplicate email", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: "existing" } as any);

      const req = makeRequest("/api/users", "POST", {
        email: "taken@test.com",
        password: "12345678",
        role: "USER",
      });
      const res = await POST(req);
      expect(res.status).toBe(409);
    });
  });

  // --- PUT /api/users/[id] ---
  describe("PUT /api/users/[id]", () => {
    it("updates user successfully", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...sampleUser, passwordHash: "hash" } as any);
      mockPrisma.user.update.mockResolvedValue({ ...sampleUser, name: "Updated" } as any);

      const req = makeRequest("/api/users/user-2", "PUT", { name: "Updated" });
      const res = await PUT(req, makeParams("user-2"));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.user.name).toBe("Updated");
    });

    it("returns 400 for invalid email", async () => {
      const req = makeRequest("/api/users/user-2", "PUT", { email: "bad" });
      const res = await PUT(req, makeParams("user-2"));
      expect(res.status).toBe(400);
    });

    it("returns 400 for invalid role", async () => {
      const req = makeRequest("/api/users/user-2", "PUT", { role: "SUPERADMIN" });
      const res = await PUT(req, makeParams("user-2"));
      expect(res.status).toBe(400);
    });

    it("returns 404 for non-existent user", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const req = makeRequest("/api/users/non-existent", "PUT", { name: "X" });
      const res = await PUT(req, makeParams("non-existent"));
      expect(res.status).toBe(404);
    });

    it("returns 409 for duplicate email", async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ ...sampleUser, passwordHash: "hash", email: "old@test.com" } as any)
        .mockResolvedValueOnce({ id: "other" } as any); // email taken

      const req = makeRequest("/api/users/user-2", "PUT", { email: "taken@test.com" });
      const res = await PUT(req, makeParams("user-2"));
      expect(res.status).toBe(409);
    });
  });

  // --- DELETE /api/users/[id] ---
  describe("DELETE /api/users/[id]", () => {
    it("deletes user successfully", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...sampleUser, passwordHash: "hash" } as any);
      mockPrisma.user.delete.mockResolvedValue(sampleUser as any);

      const req = makeRequest("/api/users/user-2", "DELETE");
      const res = await DELETE(req, makeParams("user-2"));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.message).toBe("Benutzer gelöscht");
    });

    it("returns 403 for self-deletion", async () => {
      const req = makeRequest("/api/users/admin-1", "DELETE");
      const res = await DELETE(req, makeParams("admin-1"));
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain("Eigenen Account");
    });

    it("returns 404 for non-existent user", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const req = makeRequest("/api/users/non-existent", "DELETE");
      const res = await DELETE(req, makeParams("non-existent"));
      expect(res.status).toBe(404);
    });
  });

  // --- POST /api/users/[id]/reset-password ---
  describe("POST /api/users/[id]/reset-password", () => {
    it("resets password and returns temporary password", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...sampleUser, passwordHash: "old" } as any);
      mockPrisma.user.update.mockResolvedValue(sampleUser as any);

      const req = makeRequest("/api/users/user-2/reset-password", "POST");
      const res = await RESET_PASSWORD(req, makeParams("user-2"));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.temporaryPassword).toBeDefined();
      expect(typeof json.temporaryPassword).toBe("string");
      expect(json.temporaryPassword.length).toBeGreaterThan(0);
    });

    it("returns 404 for non-existent user", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const req = makeRequest("/api/users/non-existent/reset-password", "POST");
      const res = await RESET_PASSWORD(req, makeParams("non-existent"));
      expect(res.status).toBe(404);
    });

    it("returns 500 on unexpected error", async () => {
      mockPrisma.user.findUnique.mockRejectedValue(new Error("DB down"));

      const req = makeRequest("/api/users/user-2/reset-password", "POST");
      const res = await RESET_PASSWORD(req, makeParams("user-2"));
      expect(res.status).toBe(500);
    });
  });
});
