import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth
const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

// Mock coach-service
const mockGenerateCoachTipp = vi.fn();
vi.mock("@/lib/services/coach-service", () => {
  class CoachError extends Error {
    statusCode: number;
    constructor(message: string, statusCode: number) {
      super(message);
      this.name = "CoachError";
      this.statusCode = statusCode;
    }
  }
  return {
    generateCoachTipp: (...args: unknown[]) => mockGenerateCoachTipp(...args),
    CoachError,
  };
});

import { POST } from "@/app/api/songs/[id]/coach/route";
import { CoachError } from "@/lib/services/coach-service";
import { NextRequest } from "next/server";

const userSession = {
  user: { id: "user-1", email: "test@example.com", name: "Test", role: "USER" },
};

function makeRequest(url: string): NextRequest {
  return new NextRequest(`http://localhost${url}`, { method: "POST" });
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("Coach API - POST /api/songs/[id]/coach", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(userSession);
  });

  it("returns 401 without session", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(makeRequest("/api/songs/song-1/coach"), makeParams("song-1"));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Nicht authentifiziert");
  });

  it("returns 403 when user does not own the song", async () => {
    mockGenerateCoachTipp.mockRejectedValue(new CoachError("Zugriff verweigert", 403));
    const res = await POST(makeRequest("/api/songs/song-1/coach"), makeParams("song-1"));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe("Zugriff verweigert");
  });

  it("returns 404 when song does not exist", async () => {
    mockGenerateCoachTipp.mockRejectedValue(new CoachError("Song nicht gefunden", 404));
    const res = await POST(makeRequest("/api/songs/song-1/coach"), makeParams("song-1"));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe("Song nicht gefunden");
  });

  it("returns 400 when profile is incomplete", async () => {
    mockGenerateCoachTipp.mockRejectedValue(
      new CoachError(
        "Bitte vervollständige zuerst dein Profil (Geschlecht, Erfahrungslevel und Stimmlage sind erforderlich).",
        400
      )
    );
    const res = await POST(makeRequest("/api/songs/song-1/coach"), makeParams("song-1"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Profil");
  });

  it("returns coachTipp on success", async () => {
    mockGenerateCoachTipp.mockResolvedValue({ coachTipp: "Ein personalisierter Tipp" });
    const res = await POST(makeRequest("/api/songs/song-1/coach"), makeParams("song-1"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.coachTipp).toBe("Ein personalisierter Tipp");
  });

  it("passes correct userId and songId to service", async () => {
    mockGenerateCoachTipp.mockResolvedValue({ coachTipp: "Tipp" });
    await POST(makeRequest("/api/songs/my-song-id/coach"), makeParams("my-song-id"));
    expect(mockGenerateCoachTipp).toHaveBeenCalledWith("user-1", "my-song-id");
  });

  it("returns 500 on unexpected error", async () => {
    mockGenerateCoachTipp.mockRejectedValue(new Error("Unexpected DB error"));
    const res = await POST(makeRequest("/api/songs/song-1/coach"), makeParams("song-1"));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("Interner Serverfehler");
  });
});
