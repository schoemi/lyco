/**
 * Bug-Condition Explorations-Test – Upload-Auth-Check
 *
 * Dieser Test wird VOR der Implementierung des Fixes geschrieben und soll auf
 * dem unfixierten Code FEHLSCHLAGEN. Das Fehlschlagen bestätigt, dass die Bugs existieren.
 *
 * Bug: Die Upload-Serving-Endpunkte `/api/uploads/audio/[...path]` und
 * `/api/uploads/covers/[...path]` liefern Dateien ohne jegliche Authentifizierung
 * oder Autorisierung aus. `/api/uploads/` steht in `publicApiPrefixes`, wodurch
 * die Middleware-Auth-Prüfung umgangen wird. Die Route-Handler selbst prüfen
 * weder Session noch Eigentümerschaft.
 *
 * Bug Condition: isBugCondition(input) where input.session = NULL
 *   OR (input.session.userId ≠ fileOwnerUserId AND NOT hatSongZugriff(songId, userId))
 *
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5**
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────

// Mock fs/promises so route handlers don't touch the real filesystem
vi.mock("fs/promises", () => ({
  readFile: vi.fn().mockResolvedValue(Buffer.from("fake-file-content")),
  stat: vi.fn().mockResolvedValue({ size: 18, isFile: () => true }),
  open: vi.fn().mockResolvedValue({
    read: vi.fn().mockResolvedValue({ bytesRead: 18 }),
    close: vi.fn().mockResolvedValue(undefined),
  }),
}));

// Mock auth – controlled per test
const { mockAuth } = vi.hoisted(() => {
  const _mockAuth = vi.fn().mockResolvedValue(null);
  return { mockAuth: _mockAuth };
});

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

// Mock prisma for file-to-song resolution
vi.mock("@/lib/prisma", () => ({
  prisma: {
    audioQuelle: { findFirst: vi.fn() },
    song: { findFirst: vi.fn(), findUnique: vi.fn() },
    songFreigabe: { findUnique: vi.fn() },
    setFreigabe: { findFirst: vi.fn() },
  },
}));

// Mock hatSongZugriff – always returns false for bug condition tests
vi.mock("@/lib/services/freigabe-service", () => ({
  hatSongZugriff: vi.fn().mockResolvedValue(false),
}));

// ── Imports (after mocks) ──────────────────────────────────────────

import { prisma } from "@/lib/prisma";
import {
  GET as audioGET,
  HEAD as audioHEAD,
} from "@/app/api/uploads/audio/[...path]/route";
import { GET as coversGET } from "@/app/api/uploads/covers/[...path]/route";

const mockPrisma = vi.mocked(prisma);

// ── Generators ─────────────────────────────────────────────────────

/** UUID-based filenames like the app uses */
const arbUuid = fc.uuid();

const arbAudioFilename = arbUuid.map((uuid) => `${uuid}.mp3`);
const arbCoverFilename = arbUuid.map((uuid) => `${uuid}.jpg`);

const arbOwnerId = fc.stringMatching(/^owner-[a-z0-9]{4,12}$/);
const arbForeignUserId = fc.stringMatching(/^foreign-[a-z0-9]{4,12}$/);
const arbSongId = fc.stringMatching(/^song-[a-z0-9]{4,12}$/);

type AuthScenario = "unauthenticated" | "unauthorized";
const arbAuthScenario = fc.constantFrom<AuthScenario>(
  "unauthenticated",
  "unauthorized"
);

type EndpointType = "audio" | "covers";
const arbEndpointType = fc.constantFrom<EndpointType>("audio", "covers");

type HttpMethod = "GET" | "HEAD";
const arbHttpMethod = fc.constantFrom<HttpMethod>("GET", "HEAD");

// ── Helpers ────────────────────────────────────────────────────────

function makeRequest(method: string, url: string): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), { method });
}

function makeParams(path: string[]): { params: Promise<{ path: string[] }> } {
  return { params: Promise.resolve({ path }) };
}

function setupMocksForScenario(
  scenario: AuthScenario,
  endpointType: EndpointType,
  filename: string,
  ownerId: string,
  foreignUserId: string,
  songId: string
) {
  if (scenario === "unauthenticated") {
    mockAuth.mockResolvedValue(null);
  } else {
    // unauthorized: valid session but foreign user
    mockAuth.mockResolvedValue({
      user: { id: foreignUserId, email: "foreign@test.de", name: "Foreign" },
    });
  }

  // Mock file-to-song resolution
  if (endpointType === "audio") {
    (mockPrisma.audioQuelle.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "aq-1",
      songId,
      url: `/api/uploads/audio/${filename}`,
    });
    (mockPrisma.song.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: songId,
      userId: ownerId,
    });
  } else {
    (mockPrisma.song.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: songId,
      userId: ownerId,
      coverUrl: `/api/uploads/covers/${filename}`,
    });
  }
}

async function callEndpoint(
  method: HttpMethod,
  endpointType: EndpointType,
  filename: string
): Promise<Response> {
  const url = `/api/uploads/${endpointType}/${filename}`;
  const req = makeRequest(method, url);
  const params = makeParams([filename]);

  if (endpointType === "audio") {
    if (method === "HEAD") {
      return audioHEAD(req, params);
    }
    return audioGET(req, params);
  } else {
    // covers only has GET
    return coversGET(req, params);
  }
}

// ── Tests ──────────────────────────────────────────────────────────

describe("Bug Condition: Unauthentifizierte/Unbefugte Upload-Anfragen werden nicht abgelehnt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Property 1: Bug Condition – Unauthenticated requests
   *
   * For any upload-serving request without a valid session,
   * the route SHOULD return 401 and NOT serve file content.
   *
   * On unfixed code: Routes return 200 with file content (BUG).
   *
   * **Validates: Requirements 1.1, 1.2, 1.3, 2.1, 2.2, 2.3**
   */
  it("unauthenticated requests should receive 401 (not 200 with file content)", async () => {
    await fc.assert(
      fc.asyncProperty(
        arbEndpointType,
        arbHttpMethod,
        arbAudioFilename,
        arbCoverFilename,
        arbOwnerId,
        arbSongId,
        async (endpointType, method, audioFilename, coverFilename, ownerId, songId) => {
          // HEAD only applies to audio endpoint
          if (endpointType === "covers" && method === "HEAD") return;

          vi.clearAllMocks();

          const filename = endpointType === "audio" ? audioFilename : coverFilename;

          setupMocksForScenario(
            "unauthenticated",
            endpointType,
            filename,
            ownerId,
            "irrelevant",
            songId
          );

          const response = await callEndpoint(method, endpointType, filename);

          // Expected: 401 (unauthenticated)
          // Bug: returns 200 with file content
          expect(
            response.status,
            `${method} /api/uploads/${endpointType}/${filename} without session should return 401 but got ${response.status}`
          ).toBe(401);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 1: Bug Condition – Unauthorized requests (foreign user, no Freigabe)
   *
   * For any upload-serving request with a valid session but no ownership
   * or Freigabe, the route SHOULD return 403 and NOT serve file content.
   *
   * On unfixed code: Routes return 200 with file content (BUG).
   *
   * **Validates: Requirements 1.4, 1.5, 2.4, 2.5**
   */
  it("unauthorized requests (foreign user, no Freigabe) should receive 403 (not 200 with file content)", async () => {
    await fc.assert(
      fc.asyncProperty(
        arbEndpointType,
        arbHttpMethod,
        arbAudioFilename,
        arbCoverFilename,
        arbOwnerId,
        arbForeignUserId,
        arbSongId,
        async (endpointType, method, audioFilename, coverFilename, ownerId, foreignUserId, songId) => {
          // HEAD only applies to audio endpoint
          if (endpointType === "covers" && method === "HEAD") return;

          // Ensure different users
          const actualForeignId = foreignUserId === ownerId
            ? foreignUserId + "-diff"
            : foreignUserId;

          vi.clearAllMocks();

          const filename = endpointType === "audio" ? audioFilename : coverFilename;

          setupMocksForScenario(
            "unauthorized",
            endpointType,
            filename,
            ownerId,
            actualForeignId,
            songId
          );

          const response = await callEndpoint(method, endpointType, filename);

          // Expected: 403 (unauthorized)
          // Bug: returns 200 with file content
          expect(
            response.status,
            `${method} /api/uploads/${endpointType}/${filename} as foreign user should return 403 but got ${response.status}`
          ).toBe(403);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Combined property: response body should NOT contain file content
   * for any bug-condition request.
   *
   * On unfixed code: Response body contains "fake-file-content" (BUG).
   *
   * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**
   */
  it("bug-condition requests should not receive file content in response body", async () => {
    await fc.assert(
      fc.asyncProperty(
        arbAuthScenario,
        arbEndpointType,
        arbAudioFilename,
        arbCoverFilename,
        arbOwnerId,
        arbForeignUserId,
        arbSongId,
        async (scenario, endpointType, audioFilename, coverFilename, ownerId, foreignUserId, songId) => {
          vi.clearAllMocks();

          const filename = endpointType === "audio" ? audioFilename : coverFilename;
          const actualForeignId = foreignUserId === ownerId
            ? foreignUserId + "-diff"
            : foreignUserId;

          setupMocksForScenario(
            scenario,
            endpointType,
            filename,
            ownerId,
            actualForeignId,
            songId
          );

          const response = await callEndpoint("GET", endpointType, filename);

          // The response body should NOT contain the file content
          const body = await response.text();
          expect(
            body,
            `Response body for ${scenario} ${endpointType} request should not contain file content`
          ).not.toContain("fake-file-content");
        }
      ),
      { numRuns: 50 }
    );
  });
});
