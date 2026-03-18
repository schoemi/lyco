/**
 * Property 8: Eigentümer-Autorisierung
 * Property 9: Authentifizierung erforderlich
 *
 * **Validates: Requirements 5.3, 7.5, 7.6**
 */
// Feature: audio-playback-timecodes, Properties 8, 9: Auth + Ownership

import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";
import { NextRequest } from "next/server";

// --- Prisma mock (for Property 8 service-level tests) ---
vi.mock("@/lib/prisma", () => ({
  prisma: {
    song: {
      findUnique: vi.fn(),
    },
    audioQuelle: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      aggregate: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// --- Auth mock (for Property 9 API-level tests) ---
const { mockAuth } = vi.hoisted(() => {
  const _mockAuth = vi.fn().mockResolvedValue(null);
  return { mockAuth: _mockAuth };
});

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

import { prisma } from "@/lib/prisma";
import {
  getAudioQuellen,
  createAudioQuelle,
  updateAudioQuelle,
  deleteAudioQuelle,
} from "@/lib/services/audio-quelle-service";

// API route imports
import {
  GET as audioQuellenGET,
  POST as audioQuellenPOST,
} from "@/app/api/songs/[id]/audio-quellen/route";
import {
  PUT as audioQuellePUT,
  DELETE as audioQuelleDELETE,
} from "@/app/api/songs/[id]/audio-quellen/[quelleId]/route";

const mockPrisma = vi.mocked(prisma);

// --- Generators ---
const userIdArb = fc.stringMatching(/^user-[a-z0-9]{4,12}$/);
const songIdArb = fc.stringMatching(/^song-[a-z0-9]{4,12}$/);
const quelleIdArb = fc.stringMatching(/^quelle-[a-z0-9]{4,12}$/);
const audioTypArb = fc.constantFrom("MP3" as const, "SPOTIFY" as const, "YOUTUBE" as const);
const labelArb = fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0);
const validUrlArb = fc.constantFrom(
  "https://example.com/song.mp3",
  "https://open.spotify.com/track/abc123",
  "https://www.youtube.com/watch?v=abc123",
);

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
 * Property 8: Eigentümer-Autorisierung
 *
 * Für jeden Nutzer und jeden Song, der einem anderen Nutzer gehört:
 * Alle CRUD-Operationen auf Audio-Quellen dieses Songs sollen mit
 * "Zugriff verweigert" abgelehnt werden.
 *
 * **Validates: Requirements 5.3, 7.6**
 */
describe("Property 8: Eigentümer-Autorisierung", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getAudioQuellen throws 'Zugriff verweigert' when song belongs to different user", async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        songIdArb,
        userIdArb.filter((otherId) => true),
        async (requestingUserId, songId, ownerUserId) => {
          // Ensure different users
          const actualOwner = requestingUserId === ownerUserId
            ? ownerUserId + "-other"
            : ownerUserId;

          vi.clearAllMocks();
          (mockPrisma.song.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            id: songId,
            userId: actualOwner,
          });

          await expect(
            getAudioQuellen(songId, requestingUserId)
          ).rejects.toThrow("Zugriff verweigert");
        },
      ),
      { numRuns: 100 },
    );
  });

  it("createAudioQuelle throws 'Zugriff verweigert' when song belongs to different user", async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        songIdArb,
        userIdArb,
        validUrlArb,
        audioTypArb,
        labelArb,
        async (requestingUserId, songId, ownerUserId, url, typ, label) => {
          const actualOwner = requestingUserId === ownerUserId
            ? ownerUserId + "-other"
            : ownerUserId;

          vi.clearAllMocks();
          (mockPrisma.song.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            id: songId,
            userId: actualOwner,
          });

          await expect(
            createAudioQuelle(songId, { url, typ, label }, requestingUserId)
          ).rejects.toThrow("Zugriff verweigert");
        },
      ),
      { numRuns: 100 },
    );
  });

  it("updateAudioQuelle throws 'Zugriff verweigert' when song belongs to different user", async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        songIdArb,
        quelleIdArb,
        userIdArb,
        async (requestingUserId, songId, quelleId, ownerUserId) => {
          const actualOwner = requestingUserId === ownerUserId
            ? ownerUserId + "-other"
            : ownerUserId;

          vi.clearAllMocks();

          // Mock audioQuelle.findUnique to return the quelle
          (mockPrisma.audioQuelle.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            id: quelleId,
            songId,
            url: "https://example.com/song.mp3",
            typ: "MP3",
            label: "Test",
            orderIndex: 0,
          });

          // Mock song ownership check - different owner
          (mockPrisma.song.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            id: songId,
            userId: actualOwner,
          });

          await expect(
            updateAudioQuelle(quelleId, { label: "New Label" }, requestingUserId)
          ).rejects.toThrow("Zugriff verweigert");
        },
      ),
      { numRuns: 100 },
    );
  });

  it("deleteAudioQuelle throws 'Zugriff verweigert' when song belongs to different user", async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        songIdArb,
        quelleIdArb,
        userIdArb,
        async (requestingUserId, songId, quelleId, ownerUserId) => {
          const actualOwner = requestingUserId === ownerUserId
            ? ownerUserId + "-other"
            : ownerUserId;

          vi.clearAllMocks();

          // Mock audioQuelle.findUnique to return the quelle
          (mockPrisma.audioQuelle.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            id: quelleId,
            songId,
            url: "https://example.com/song.mp3",
            typ: "MP3",
            label: "Test",
            orderIndex: 0,
          });

          // Mock song ownership check - different owner
          (mockPrisma.song.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            id: songId,
            userId: actualOwner,
          });

          await expect(
            deleteAudioQuelle(quelleId, requestingUserId)
          ).rejects.toThrow("Zugriff verweigert");
        },
      ),
      { numRuns: 100 },
    );
  });
});

/**
 * Property 9: Authentifizierung erforderlich
 *
 * Für jeden API-Request ohne gültige Session: Alle Endpunkte unter
 * /api/songs/[id]/audio-quellen sollen mit Status 401 antworten.
 *
 * **Validates: Requirements 7.5**
 */
describe("Property 9: Authentifizierung erforderlich", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(null);
  });

  it("all audio-quellen API routes return 401 when no session", async () => {
    await fc.assert(
      fc.asyncProperty(
        songIdArb,
        quelleIdArb,
        validUrlArb,
        audioTypArb,
        labelArb,
        async (songId, quelleId, url, typ, label) => {
          mockAuth.mockResolvedValue(null);

          const routes: Array<{ name: string; call: () => Promise<Response> }> = [
            {
              name: "GET /api/songs/[id]/audio-quellen",
              call: () =>
                audioQuellenGET(
                  makeRequest("GET", `/api/songs/${songId}/audio-quellen`),
                  makeParams({ id: songId }),
                ),
            },
            {
              name: "POST /api/songs/[id]/audio-quellen",
              call: () =>
                audioQuellenPOST(
                  makeRequest("POST", `/api/songs/${songId}/audio-quellen`, { url, typ, label }),
                  makeParams({ id: songId }),
                ),
            },
            {
              name: "PUT /api/songs/[id]/audio-quellen/[quelleId]",
              call: () =>
                audioQuellePUT(
                  makeRequest("PUT", `/api/songs/${songId}/audio-quellen/${quelleId}`, { label: "Updated" }),
                  makeParams({ id: songId, quelleId }),
                ),
            },
            {
              name: "DELETE /api/songs/[id]/audio-quellen/[quelleId]",
              call: () =>
                audioQuelleDELETE(
                  makeRequest("DELETE", `/api/songs/${songId}/audio-quellen/${quelleId}`),
                  makeParams({ id: songId, quelleId }),
                ),
            },
          ];

          for (const route of routes) {
            const response = await route.call();
            expect(
              response.status,
              `${route.name} should return 401 but got ${response.status}`,
            ).toBe(401);

            const json = await response.json();
            expect(json.error).toBe("Nicht authentifiziert");
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
