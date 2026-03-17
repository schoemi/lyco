import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth
const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

// Mock streak-service
const mockGetStreak = vi.fn();
vi.mock("@/lib/services/streak-service", () => ({
  getStreak: (...args: unknown[]) => mockGetStreak(...args),
}));

import { GET } from "@/app/api/streak/route";

const authenticatedSession = {
  user: { id: "user-1", email: "user@test.com", name: "Test User", role: "USER" },
};

describe("GET /api/streak", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(authenticatedSession);
  });

  // Requirement 11.4: Endpunkt mit Authentifizierung schützen
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });

  // Requirement 11.1: GET-Endpunkt gibt aktuellen Streak-Wert zurück
  it("returns { streak: N } with status 200 when authenticated", async () => {
    mockGetStreak.mockResolvedValue(5);
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ streak: 5 });
    expect(mockGetStreak).toHaveBeenCalledWith("user-1");
  });

  // Requirements 11.2, 11.3: Streak 0 when expired or no record
  it("returns { streak: 0 } when streak has expired or does not exist", async () => {
    mockGetStreak.mockResolvedValue(0);
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ streak: 0 });
  });

  // Error handling: 500 on internal error
  it("returns 500 when getStreak throws an error", async () => {
    mockGetStreak.mockRejectedValue(new Error("DB connection failed"));
    const res = await GET();
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });

  // Requirement 11.1: Response has correct JSON format { streak: number }
  it("response has correct JSON format { streak: number }", async () => {
    mockGetStreak.mockResolvedValue(12);
    const res = await GET();
    const json = await res.json();
    expect(json).toHaveProperty("streak");
    expect(typeof json.streak).toBe("number");
    // No extra fields beyond streak
    expect(Object.keys(json)).toEqual(["streak"]);
  });
});
