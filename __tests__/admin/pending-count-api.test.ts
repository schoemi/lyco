import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth
const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

// Mock user-service
const mockGetPendingCount = vi.fn();
vi.mock("@/lib/services/user-service", () => ({
  getPendingCount: (...args: unknown[]) => mockGetPendingCount(...args),
}));

import { GET } from "@/app/api/users/pending/count/route";

const adminSession = {
  user: { id: "admin-1", email: "admin@test.com", name: "Admin", role: "ADMIN" },
};
const userSession = {
  user: { id: "user-1", email: "user@test.com", name: "User", role: "USER" },
};

describe("GET /api/users/pending/count", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(adminSession);
  });

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

  it("returns the pending count", async () => {
    mockGetPendingCount.mockResolvedValue(5);
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.count).toBe(5);
  });

  it("returns 0 when no pending users", async () => {
    mockGetPendingCount.mockResolvedValue(0);
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.count).toBe(0);
  });

  it("returns 500 on unexpected error", async () => {
    mockGetPendingCount.mockRejectedValue(new Error("DB down"));
    const res = await GET();
    expect(res.status).toBe(500);
  });
});
