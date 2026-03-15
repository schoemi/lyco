/**
 * Property 14: Authentifizierung erforderlich
 *
 * Für jede Song-bezogene API-Route gilt: Ein Request ohne gültige Session
 * muss mit HTTP 401 abgelehnt werden.
 *
 * **Validates: Requirements 9.1**
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

// Mock all service modules to prevent real calls (auth should block before these)
vi.mock("@/lib/services/set-service", () => ({
  listSets: vi.fn(),
  createSet: vi.fn(),
  updateSet: vi.fn(),
  deleteSet: vi.fn(),
  addSongToSet: vi.fn(),
  removeSongFromSet: vi.fn(),
}));

vi.mock("@/lib/services/song-service", () => ({
  listSongs: vi.fn(),
  createSong: vi.fn(),
  importSong: vi.fn(),
  getSongDetail: vi.fn(),
  updateSong: vi.fn(),
  deleteSong: vi.fn(),
}));

vi.mock("@/lib/services/session-service", () => ({
  createSession: vi.fn(),
  getSessionCount: vi.fn(),
  getTotalSessionCount: vi.fn(),
}));

vi.mock("@/lib/services/progress-service", () => ({
  updateProgress: vi.fn(),
  getSongProgress: vi.fn(),
  getAverageProgress: vi.fn(),
}));

vi.mock("@/lib/services/note-service", () => ({
  upsertNote: vi.fn(),
  deleteNote: vi.fn(),
}));

vi.mock("@/lib/services/markup-service", () => ({
  createMarkup: vi.fn(),
  updateMarkup: vi.fn(),
  deleteMarkup: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {},
}));

// --- Import route handlers ---
import { GET as setsGET, POST as setsPOST } from "@/app/api/sets/route";
import { PUT as setIdPUT, DELETE as setIdDELETE } from "@/app/api/sets/[id]/route";
import { POST as setIdSongsPOST } from "@/app/api/sets/[id]/songs/route";
import { DELETE as setIdSongIdDELETE } from "@/app/api/sets/[id]/songs/[songId]/route";
import { GET as songsGET, POST as songsPOST } from "@/app/api/songs/route";
import { POST as songsImportPOST } from "@/app/api/songs/import/route";
import { GET as songIdGET, PUT as songIdPUT, DELETE as songIdDELETE } from "@/app/api/songs/[id]/route";
import { GET as sessionsGET, POST as sessionsPOST } from "@/app/api/sessions/route";
import { PUT as progressPUT, GET as progressGET } from "@/app/api/progress/route";
import { POST as notesPOST } from "@/app/api/notes/route";
import { DELETE as noteIdDELETE } from "@/app/api/notes/[id]/route";
import { POST as markupsPOST } from "@/app/api/markups/route";
import { PUT as markupIdPUT, DELETE as markupIdDELETE } from "@/app/api/markups/[id]/route";
import { GET as dashboardGET } from "@/app/api/dashboard/route";

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

// Arbitrary for random JSON-like body content
const randomBodyArb = fc.record({
  name: fc.string(),
  titel: fc.string(),
  songId: fc.string(),
  stropheId: fc.string(),
  text: fc.string(),
  prozent: fc.integer(),
  lernmethode: fc.string(),
  typ: fc.string(),
  ziel: fc.string(),
});


// --- Route definitions: each entry is [name, handler call returning Response] ---
type RouteTestCase = {
  name: string;
  call: (body: Record<string, unknown>) => Promise<Response>;
};

function getRouteTestCases(body: Record<string, unknown>): RouteTestCase[] {
  return [
    // Sets
    { name: "GET /api/sets", call: () => setsGET() },
    { name: "POST /api/sets", call: () => setsPOST(makeRequest("POST", "/api/sets", body)) },
    { name: "PUT /api/sets/[id]", call: () => setIdPUT(makeRequest("PUT", "/api/sets/abc", body), makeParams({ id: "abc" })) },
    { name: "DELETE /api/sets/[id]", call: () => setIdDELETE(makeRequest("DELETE", "/api/sets/abc"), makeParams({ id: "abc" })) },
    { name: "POST /api/sets/[id]/songs", call: () => setIdSongsPOST(makeRequest("POST", "/api/sets/abc/songs", body), makeParams({ id: "abc" })) },
    { name: "DELETE /api/sets/[id]/songs/[songId]", call: () => setIdSongIdDELETE(makeRequest("DELETE", "/api/sets/abc/songs/xyz"), makeParams({ id: "abc", songId: "xyz" })) },
    // Songs
    { name: "GET /api/songs", call: () => songsGET() },
    { name: "POST /api/songs", call: () => songsPOST(makeRequest("POST", "/api/songs", body)) },
    { name: "POST /api/songs/import", call: () => songsImportPOST(makeRequest("POST", "/api/songs/import", body)) },
    { name: "GET /api/songs/[id]", call: () => songIdGET(makeRequest("GET", "/api/songs/abc"), makeParams({ id: "abc" })) },
    { name: "PUT /api/songs/[id]", call: () => songIdPUT(makeRequest("PUT", "/api/songs/abc", body), makeParams({ id: "abc" })) },
    { name: "DELETE /api/songs/[id]", call: () => songIdDELETE(makeRequest("DELETE", "/api/songs/abc"), makeParams({ id: "abc" })) },
    // Sessions
    { name: "GET /api/sessions", call: () => sessionsGET(makeRequest("GET", "/api/sessions")) },
    { name: "POST /api/sessions", call: () => sessionsPOST(makeRequest("POST", "/api/sessions", body)) },
    // Progress
    { name: "PUT /api/progress", call: () => progressPUT(makeRequest("PUT", "/api/progress", body)) },
    { name: "GET /api/progress", call: () => progressGET(makeRequest("GET", "/api/progress")) },
    // Notes
    { name: "POST /api/notes", call: () => notesPOST(makeRequest("POST", "/api/notes", body)) },
    { name: "DELETE /api/notes/[id]", call: () => noteIdDELETE(makeRequest("DELETE", "/api/notes/abc"), makeParams({ id: "abc" })) },
    // Markups
    { name: "POST /api/markups", call: () => markupsPOST(makeRequest("POST", "/api/markups", body)) },
    { name: "PUT /api/markups/[id]", call: () => markupIdPUT(makeRequest("PUT", "/api/markups/abc", body), makeParams({ id: "abc" })) },
    { name: "DELETE /api/markups/[id]", call: () => markupIdDELETE(makeRequest("DELETE", "/api/markups/abc"), makeParams({ id: "abc" })) },
    // Dashboard
    { name: "GET /api/dashboard", call: () => dashboardGET() },
  ];
}

describe("Property 14: Authentifizierung erforderlich", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(null);
  });

  it("Alle Song-bezogenen API-Routen geben 401 zurück wenn keine Session vorhanden ist", () => {
    return fc.assert(
      fc.asyncProperty(randomBodyArb, async (body) => {
        mockAuth.mockResolvedValue(null);

        const routes = getRouteTestCases(body as Record<string, unknown>);

        for (const route of routes) {
          const response = await route.call(body as Record<string, unknown>);
          expect(
            response.status,
            `${route.name} should return 401 but got ${response.status}`
          ).toBe(401);

          const json = await response.json();
          expect(json.error).toBeDefined();
        }
      }),
      { numRuns: 20 }
    );
  });
});
