/**
 * Property 3: Authentifizierungspflicht für Genius-Endpunkte
 *
 * Für jede nicht-authentifizierte Anfrage an POST /api/songs/genius/search
 * oder POST /api/songs/genius/import soll das System den HTTP-Status 401
 * zurückgeben.
 *
 * Feature: genius-song-import, Property 3: Authentifizierungspflicht für Genius-Endpunkte
 *
 * **Validates: Requirements 4.2, 4.3**
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";
import { NextRequest } from "next/server";

// --- Mock auth to return null (no session) ---
const { mockAuth } = vi.hoisted(() => {
  const _mockAuth = vi.fn().mockResolvedValue(null);
  return { mockAuth: _mockAuth };
});

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

// Mock dependencies to prevent real calls (auth should block before these)
vi.mock("@/lib/genius/api-key-store", () => ({
  getUserApiKey: vi.fn(),
}));

vi.mock("@/lib/genius/client", () => ({
  searchSongs: vi.fn(),
  fetchLyrics: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {},
}));

// --- Import route handler ---
import { POST as searchPOST } from "@/app/api/songs/genius/search/route";

// --- Helpers ---
function makeRequest(url: string, body?: unknown): NextRequest {
  const init: RequestInit = { method: "POST" };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers = { "Content-Type": "application/json" };
  }
  return new NextRequest(new URL(url, "http://localhost:3000"), init);
}

// Arbitrary for random search query bodies
const randomSearchBodyArb = fc.record({
  query: fc.string({ minLength: 0, maxLength: 200 }),
});

// Arbitrary for random import request bodies
const randomImportBodyArb = fc.record({
  geniusId: fc.integer({ min: 1, max: 999999 }),
  title: fc.string({ minLength: 1, maxLength: 100 }),
  artist: fc.string({ minLength: 1, maxLength: 100 }),
  geniusUrl: fc.constant("https://genius.com/some-song-lyrics"),
});

describe("Feature: genius-song-import, Property 3: Authentifizierungspflicht für Genius-Endpunkte", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(null);
  });

  it("POST /api/songs/genius/search gibt 401 zurück für jede nicht-authentifizierte Anfrage", () => {
    return fc.assert(
      fc.asyncProperty(randomSearchBodyArb, async (body) => {
        mockAuth.mockResolvedValue(null);

        const request = makeRequest(
          "/api/songs/genius/search",
          body
        );
        const response = await searchPOST(request);

        expect(response.status).toBe(401);

        const json = await response.json();
        expect(json.error).toBeDefined();
        expect(json.error).toBe("Nicht authentifiziert");
      }),
      { numRuns: 100 }
    );
  });

  it("POST /api/songs/genius/search gibt 401 zurück wenn Session kein User-Objekt hat", () => {
    return fc.assert(
      fc.asyncProperty(randomSearchBodyArb, async (body) => {
        // Session exists but has no user
        mockAuth.mockResolvedValue({ user: null });

        const request = makeRequest(
          "/api/songs/genius/search",
          body
        );
        const response = await searchPOST(request);

        expect(response.status).toBe(401);

        const json = await response.json();
        expect(json.error).toBe("Nicht authentifiziert");
      }),
      { numRuns: 100 }
    );
  });

  it("POST /api/songs/genius/search gibt 401 zurück wenn Session undefined ist", () => {
    return fc.assert(
      fc.asyncProperty(randomSearchBodyArb, async (body) => {
        mockAuth.mockResolvedValue(undefined);

        const request = makeRequest(
          "/api/songs/genius/search",
          body
        );
        const response = await searchPOST(request);

        expect(response.status).toBe(401);

        const json = await response.json();
        expect(json.error).toBe("Nicht authentifiziert");
      }),
      { numRuns: 100 }
    );
  });
});
