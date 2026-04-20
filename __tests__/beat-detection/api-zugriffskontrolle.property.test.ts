/**
 * Property 8: API-Zugriffskontrolle
 *
 * **Validates: Requirements 6.6, 6.7**
 *
 * For every API request to /api/songs/[id]/beat-ergebnis:
 * - Without valid auth → 401
 * - Authenticated user accessing another user's song → 403
 */
// Feature: beat-detection, Property 8: API-Zugriffskontrolle

import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";
import { NextRequest } from "next/server";

// --- Auth mock ---
const { mockAuth } = vi.hoisted(() => {
  const _mockAuth = vi.fn().mockResolvedValue(null);
  return { mockAuth: _mockAuth };
});

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

// --- Service mocks ---
const mockGetBeatErgebnis = vi.fn();
const mockUpsertBeatErgebnis = vi.fn();

vi.mock("@/lib/services/beat-ergebnis-service", () => ({
  getBeatErgebnis: (...args: unknown[]) => mockGetBeatErgebnis(...args),
  upsertBeatErgebnis: (...args: unknown[]) => mockUpsertBeatErgebnis(...args),
}));

import { GET, PUT } from "@/app/api/songs/[id]/beat-ergebnis/route";

// --- Generators ---
const songIdArb = fc.stringMatching(/^song-[a-z0-9]{4,12}$/);
const bpmArb = fc.integer({ min: 20, max: 300 });
const methodeArb = fc.constantFrom("AUTOMATISCH" as const, "MANUELL" as const);

// --- Helpers ---
function makeRequest(method: string, url: string, body?: unknown): NextRequest {
  const init: RequestInit = { method };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers = { "Content-Type": "application/json" };
  }
  return new NextRequest(new URL(url, "http://localhost:3000"), init);
}

function makeParams<T extends Record<string, string>>(obj: T): { params: Promise<T> } {
  return { params: Promise.resolve(obj) };
}

/**
 * Property 8a: Authentifizierung erforderlich
 *
 * For every API request without valid session: both GET and PUT endpoints
 * should return status 401.
 */
describe("Property 8: API-Zugriffskontrolle — Authentifizierung", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(null);
  });

  it("all beat-ergebnis API routes return 401 when no session", async () => {
    await fc.assert(
      fc.asyncProperty(songIdArb, bpmArb, methodeArb, async (songId, bpm, methode) => {
        mockAuth.mockResolvedValue(null);

        // GET
        const getRes = await GET(
          makeRequest("GET", `/api/songs/${songId}/beat-ergebnis`),
          makeParams({ id: songId }),
        );
        expect(getRes.status).toBe(401);
        const getJson = await getRes.json();
        expect(getJson.error).toBe("Nicht authentifiziert");

        // PUT
        const putRes = await PUT(
          makeRequest("PUT", `/api/songs/${songId}/beat-ergebnis`, {
            bpm,
            methode,
            beatPositionenMs: [0, 500, 1000],
          }),
          makeParams({ id: songId }),
        );
        expect(putRes.status).toBe(401);
        const putJson = await putRes.json();
        expect(putJson.error).toBe("Nicht authentifiziert");
      }),
      { numRuns: 100 },
    );
  });
});

/**
 * Property 8b: Eigentümer-Autorisierung
 *
 * For every authenticated user accessing another user's song:
 * both GET and PUT should return status 403.
 */
describe("Property 8: API-Zugriffskontrolle — Eigentümer-Autorisierung", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 when accessing another user's song", async () => {
    await fc.assert(
      fc.asyncProperty(songIdArb, bpmArb, methodeArb, async (songId, bpm, methode) => {
        vi.clearAllMocks();

        const session = {
          user: { id: "user-requester", email: "req@test.com", name: "Requester" },
        };
        mockAuth.mockResolvedValue(session);

        // Service throws "Zugriff verweigert" for foreign songs
        mockGetBeatErgebnis.mockRejectedValue(new Error("Zugriff verweigert"));
        mockUpsertBeatErgebnis.mockRejectedValue(new Error("Zugriff verweigert"));

        // GET
        const getRes = await GET(
          makeRequest("GET", `/api/songs/${songId}/beat-ergebnis`),
          makeParams({ id: songId }),
        );
        expect(getRes.status).toBe(403);
        const getJson = await getRes.json();
        expect(getJson.error).toBe("Zugriff verweigert");

        // PUT
        const putRes = await PUT(
          makeRequest("PUT", `/api/songs/${songId}/beat-ergebnis`, {
            bpm,
            methode,
            beatPositionenMs: [0, 500, 1000],
          }),
          makeParams({ id: songId }),
        );
        expect(putRes.status).toBe(403);
        const putJson = await putRes.json();
        expect(putJson.error).toBe("Zugriff verweigert");
      }),
      { numRuns: 100 },
    );
  });
});
