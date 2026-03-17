import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies before imports
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    systemSetting: {
      findUnique: vi.fn(),
    },
  },
}));
vi.mock("@/lib/services/rate-limiter", () => ({
  checkRateLimit: vi.fn(),
  recordFailedAttempt: vi.fn(),
  resetAttempts: vi.fn(),
}));

import { POST } from "@/app/api/auth/register/route";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

const mockPrisma = vi.mocked(prisma);

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const now = new Date();

describe("POST /api/auth/register with approval required", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates user with PENDING status when approval is required", async () => {
    // getRequireApproval reads systemSetting
    mockPrisma.systemSetting.findUnique.mockResolvedValue({
      id: "setting-1",
      key: "require-approval",
      value: "true",
      updatedAt: now,
    });
    // isEmailTaken → not taken
    mockPrisma.user.findUnique.mockResolvedValue(null);
    // createUser internally calls isEmailTaken again, then create
    mockPrisma.user.create.mockResolvedValue({
      id: "new-id",
      email: "new@example.com",
      name: "Test",
      role: "USER",
      accountStatus: "PENDING",
      createdAt: now,
      updatedAt: now,
    } as any);

    const res = await POST(makeRequest({ email: "new@example.com", name: "Test", password: "12345678" }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.user).toBeDefined();
    expect(json.message).toBe(
      "Ihre Registrierung war erfolgreich. Ihr Konto muss noch von einem Administrator bestätigt werden."
    );
  });

  it("creates user with ACTIVE status when approval is not required", async () => {
    // getRequireApproval → false (no setting found)
    mockPrisma.systemSetting.findUnique.mockResolvedValue(null);
    // isEmailTaken → not taken
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({
      id: "new-id",
      email: "new@example.com",
      name: "Test",
      role: "USER",
      accountStatus: "ACTIVE",
      createdAt: now,
      updatedAt: now,
    } as any);

    const res = await POST(makeRequest({ email: "new@example.com", name: "Test", password: "12345678" }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.user).toBeDefined();
    expect(json.message).toBeUndefined();
  });

  it("returns hint message only when approval is required", async () => {
    // approval required
    mockPrisma.systemSetting.findUnique.mockResolvedValue({
      id: "setting-1",
      key: "require-approval",
      value: "true",
      updatedAt: now,
    });
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({
      id: "new-id",
      email: "another@example.com",
      name: null,
      role: "USER",
      accountStatus: "PENDING",
      createdAt: now,
      updatedAt: now,
    } as any);

    const res = await POST(makeRequest({ email: "another@example.com", password: "securepass" }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.message).toContain("Administrator bestätigt");
  });
});
