/**
 * Unit-Tests für Such-API-Route POST /api/songs/genius/search
 *
 * Testen: Auth-Fehler (401), fehlender API-Key (400),
 * erfolgreiche Suche (200), Genius-API-Fehler (502)
 *
 * Anforderungen: 2.2, 4.2, 4.4, 5.1
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// --- Hoisted mocks ---
const { mockAuth, mockGetUserApiKey, mockSearchSongs } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockGetUserApiKey: vi.fn(),
  mockSearchSongs: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/genius/api-key-store", () => ({ getUserApiKey: mockGetUserApiKey }));
vi.mock("@/lib/genius/client", () => ({ searchSongs: mockSearchSongs }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { POST } from "@/app/api/songs/genius/search/route";

// --- Helper ---
function makeRequest(body: unknown): NextRequest {
  return new NextRequest(
    new URL("/api/songs/genius/search", "http://localhost:3000"),
    {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    }
  );
}

describe("POST /api/songs/genius/search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Requirement 4.2: Auth-Fehler → 401 ---
  it("gibt 401 zurück wenn nicht authentifiziert", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await POST(makeRequest({ query: "test" }));

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Nicht authentifiziert");
  });

  // --- Requirement 4.4: Fehlender API-Key → 400 ---
  it("gibt 400 zurück wenn kein API-Schlüssel hinterlegt", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockGetUserApiKey.mockRejectedValue(new Error("Kein Schlüssel"));

    const res = await POST(makeRequest({ query: "bohemian rhapsody" }));

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Kein Genius-API-Schlüssel hinterlegt");
  });

  // --- Requirement 2.2: Erfolgreiche Suche → 200 ---
  it("gibt 200 mit Ergebnissen zurück bei erfolgreicher Suche", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockGetUserApiKey.mockResolvedValue("decrypted-api-key");

    const mockResults = [
      { id: 1, title: "Bohemian Rhapsody", artist: "Queen", url: "https://genius.com/queen-bohemian-rhapsody-lyrics", albumArt: "https://img.genius.com/cover.jpg" },
      { id: 2, title: "Bohemian Like You", artist: "The Dandy Warhols", url: "https://genius.com/dandy-warhols-bohemian-like-you-lyrics", albumArt: null },
    ];
    mockSearchSongs.mockResolvedValue(mockResults);

    const res = await POST(makeRequest({ query: "bohemian" }));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.results).toEqual(mockResults);
    expect(mockSearchSongs).toHaveBeenCalledWith("bohemian", "decrypted-api-key");
  });

  // --- Requirement 5.1: Genius-API-Fehler → 502 ---
  it("gibt 502 zurück wenn Genius-API fehlschlägt", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockGetUserApiKey.mockResolvedValue("decrypted-api-key");
    mockSearchSongs.mockRejectedValue(new Error("Genius API down"));

    const res = await POST(makeRequest({ query: "test" }));

    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json.error).toBe("Genius-Suche fehlgeschlagen");
  });

  // --- Leere Query wird als leerer String weitergegeben ---
  it("gibt 200 zurück bei leerer Query", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockGetUserApiKey.mockResolvedValue("key");
    mockSearchSongs.mockResolvedValue([]);

    const res = await POST(makeRequest({}));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.results).toEqual([]);
    expect(mockSearchSongs).toHaveBeenCalledWith("", "key");
  });
});
