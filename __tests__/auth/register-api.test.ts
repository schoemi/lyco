import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies before imports
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
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

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for invalid email", async () => {
    const res = await POST(makeRequest({ email: "invalid", password: "12345678" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.field).toBe("email");
  });

  it("returns 400 for missing email", async () => {
    const res = await POST(makeRequest({ password: "12345678" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.field).toBe("email");
  });

  it("returns 400 for short password", async () => {
    const res = await POST(makeRequest({ email: "test@example.com", password: "short" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.field).toBe("password");
  });

  it("returns 400 for missing password", async () => {
    const res = await POST(makeRequest({ email: "test@example.com" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.field).toBe("password");
  });

  it("returns 409 for duplicate email", async () => {
    // isEmailTaken calls prisma.user.findUnique
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      id: "existing",
      email: "taken@example.com",
      name: null,
      passwordHash: "hash",
      role: "USER",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await POST(makeRequest({ email: "taken@example.com", password: "12345678" }));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toContain("E-Mail bereits vergeben");
  });

  it("returns 201 and creates user on success", async () => {
    const now = new Date();
    // isEmailTaken → not taken
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);
    // createUser internally calls isEmailTaken again, then create
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);
    vi.mocked(prisma.user.create).mockResolvedValueOnce({
      id: "new-id",
      email: "new@example.com",
      name: "Test",
      role: "USER",
      createdAt: now,
      updatedAt: now,
    } as any);

    const res = await POST(makeRequest({ email: "new@example.com", name: "Test", password: "12345678" }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.user.email).toBe("new@example.com");
    expect(json.user.role).toBe("USER");
    expect(json.user).not.toHaveProperty("passwordHash");
  });

  it("returns 500 on unexpected error", async () => {
    // isEmailTaken throws
    vi.mocked(prisma.user.findUnique).mockRejectedValueOnce(new Error("DB down"));

    const res = await POST(makeRequest({ email: "test@example.com", password: "12345678" }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("Interner Serverfehler");
  });
});
