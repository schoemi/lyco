/**
 * Preservation Property Test – Upload-Auth-Check
 *
 * Dieser Test wird VOR der Implementierung des Fixes geschrieben und soll auf
 * dem unfixierten Code BESTEHEN. Das Bestehen bestätigt das Baseline-Verhalten,
 * das nach dem Fix erhalten bleiben muss.
 *
 * Property 2: Preservation – Berechtigte Upload-Anfragen funktionieren weiterhin
 *
 * Für alle autorisierten Anfragen (Eigentümer oder Freigabe-Empfänger) sollen
 * Response-Status, Content-Type, Cache-Control-Header und Dateiinhalt dem
 * beobachteten Verhalten entsprechen.
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.8**
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────

// Mock fs/promises so route handlers don't touch the real filesystem
const FAKE_AUDIO_CONTENT = Buffer.from("fake-audio-file-content-mp3");
const FAKE_COVER_CONTENT = Buffer.from("fake-cover-image-content-jpg");

const mockStat = vi.fn();
const mockOpen = vi.fn();
const mockReadFile = vi.fn();

vi.mock("fs/promises", () => ({
  stat: (...args: unknown[]) => mockStat(...args),
  open: (...args: unknown[]) => mockOpen(...args),
  readFile: (...args: unknown[]) => mockReadFile(...args),
}));

// Mock auth – controlled per test
const { mockAuth } = vi.hoisted(() => {
  const _mockAuth = vi.fn();
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

// Mock hatSongZugriff – returns true for authorized cases
vi.mock("@/lib/services/freigabe-service", () => ({
  hatSongZugriff: vi.fn().mockResolvedValue(true),
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

const arbUuid = fc.uuid();

const arbAudioFilename = arbUuid.map((uuid) => `${uuid}.mp3`);
const arbCoverFilename = arbUuid.map((uuid) => `${uuid}.jpg`);

const arbOwnerId = fc.stringMatching(/^owner-[a-z0-9]{4,8}$/);
const arbFreigabeUserId = fc.stringMatching(/^shared-[a-z0-9]{4,8}$/);
const arbSongId = fc.stringMatching(/^song-[a-z0-9]{4,8}$/);

type AuthRole = "owner" | "freigabe";
const arbAuthRole = fc.constantFrom<AuthRole>("owner", "freigabe");

type EndpointType = "audio" | "covers";
const arbEndpointType = fc.constantFrom<EndpointType>("audio", "covers");

type RequestType = "GET" | "HEAD" | "RANGE-GET";
const arbRequestType = fc.constantFrom<RequestType>("GET", "HEAD", "RANGE-GET");

// ── Helpers ────────────────────────────────────────────────────────

function makeRequest(method: string, url: string, headers?: Record<string, string>): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method,
    headers,
  });
}

function makeParams(path: string[]): { params: Promise<{ path: string[] }> } {
  return { params: Promise.resolve({ path }) };
}

function setupMocksForAuthorized(
  role: AuthRole,
  endpointType: EndpointType,
  filename: string,
  ownerId: string,
  freigabeUserId: string,
  songId: string
) {
  const userId = role === "owner" ? ownerId : freigabeUserId;

  // Auth returns a valid session
  mockAuth.mockResolvedValue({
    user: { id: userId, email: `${userId}@test.de`, name: userId },
  });

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

  // Setup filesystem mocks
  const content = endpointType === "audio" ? FAKE_AUDIO_CONTENT : FAKE_COVER_CONTENT;
  const fileSize = content.length;

  mockStat.mockResolvedValue({ size: fileSize, isFile: () => true });
  mockReadFile.mockResolvedValue(content);
  mockOpen.mockResolvedValue({
    read: vi.fn().mockImplementation(
      (buf: Buffer, offset: number, length: number, _position: number) => {
        content.copy(buf, offset, 0, Math.min(length, content.length));
        return Promise.resolve({ bytesRead: Math.min(length, content.length) });
      }
    ),
    close: vi.fn().mockResolvedValue(undefined),
  });
}

function setupMocksForNonExistentFile(
  ownerId: string,
  endpointType: EndpointType,
  filename: string
) {
  // Auth returns a valid session
  mockAuth.mockResolvedValue({
    user: { id: ownerId, email: `${ownerId}@test.de`, name: ownerId },
  });

  // File does not exist
  mockStat.mockRejectedValue(new Error("ENOENT: no such file or directory"));
  mockReadFile.mockRejectedValue(new Error("ENOENT: no such file or directory"));
  mockOpen.mockRejectedValue(new Error("ENOENT: no such file or directory"));

  // No DB entry either
  if (endpointType === "audio") {
    (mockPrisma.audioQuelle.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
  } else {
    (mockPrisma.song.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
  }
}

// ── Tests ──────────────────────────────────────────────────────────

describe("Preservation: Berechtigte Upload-Anfragen funktionieren weiterhin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Property 2.1: Authenticated owner GET for audio returns 200 with correct
   * Content-Type (audio/mpeg) and file content.
   *
   * **Validates: Requirements 3.1**
   */
  it("authenticated owner GET /api/uploads/audio/{uuid}.mp3 returns 200 with audio/mpeg", async () => {
    await fc.assert(
      fc.asyncProperty(
        arbAudioFilename,
        arbOwnerId,
        arbSongId,
        async (filename, ownerId, songId) => {
          vi.clearAllMocks();
          setupMocksForAuthorized("owner", "audio", filename, ownerId, "irrelevant", songId);

          const req = makeRequest("GET", `/api/uploads/audio/${filename}`);
          const params = makeParams([filename]);
          const response = await audioGET(req, params);

          expect(response.status).toBe(200);
          expect(response.headers.get("Content-Type")).toBe("audio/mpeg");
          expect(response.headers.get("Cache-Control")).toBe(
            "public, max-age=31536000, immutable"
          );
          expect(response.headers.get("Accept-Ranges")).toBe("bytes");
          expect(response.headers.get("Content-Length")).toBe(
            String(FAKE_AUDIO_CONTENT.length)
          );
        }
      ),
      { numRuns: 30 }
    );
  });

  /**
   * Property 2.2: Authenticated owner GET for covers returns 200 with correct
   * Content-Type (image/jpeg) and file content.
   *
   * **Validates: Requirements 3.2**
   */
  it("authenticated owner GET /api/uploads/covers/{uuid}.jpg returns 200 with image/jpeg", async () => {
    await fc.assert(
      fc.asyncProperty(
        arbCoverFilename,
        arbOwnerId,
        arbSongId,
        async (filename, ownerId, songId) => {
          vi.clearAllMocks();
          setupMocksForAuthorized("owner", "covers", filename, ownerId, "irrelevant", songId);

          const req = makeRequest("GET", `/api/uploads/covers/${filename}`);
          const params = makeParams([filename]);
          const response = await coversGET(req, params);

          expect(response.status).toBe(200);
          expect(response.headers.get("Content-Type")).toBe("image/jpeg");
          expect(response.headers.get("Cache-Control")).toBe(
            "public, max-age=31536000, immutable"
          );
          expect(response.headers.get("Content-Length")).toBe(
            String(FAKE_COVER_CONTENT.length)
          );
        }
      ),
      { numRuns: 30 }
    );
  });

  /**
   * Property 2.3: Authenticated owner HEAD for audio returns 200 with
   * Content-Length, Accept-Ranges headers.
   *
   * **Validates: Requirements 3.3**
   */
  it("authenticated owner HEAD /api/uploads/audio/{uuid}.mp3 returns 200 with metadata headers", async () => {
    await fc.assert(
      fc.asyncProperty(
        arbAudioFilename,
        arbOwnerId,
        arbSongId,
        async (filename, ownerId, songId) => {
          vi.clearAllMocks();
          setupMocksForAuthorized("owner", "audio", filename, ownerId, "irrelevant", songId);

          const req = makeRequest("HEAD", `/api/uploads/audio/${filename}`);
          const params = makeParams([filename]);
          const response = await audioHEAD(req, params);

          expect(response.status).toBe(200);
          expect(response.headers.get("Content-Type")).toBe("audio/mpeg");
          expect(response.headers.get("Content-Length")).toBe(
            String(FAKE_AUDIO_CONTENT.length)
          );
          expect(response.headers.get("Accept-Ranges")).toBe("bytes");
          expect(response.headers.get("Cache-Control")).toBe(
            "public, max-age=31536000, immutable"
          );
        }
      ),
      { numRuns: 30 }
    );
  });

  /**
   * Property 2.4: Authenticated owner Range-Request GET returns 206 with
   * correct Content-Range header.
   *
   * **Validates: Requirements 3.1**
   */
  it("authenticated owner Range-GET /api/uploads/audio/{uuid}.mp3 returns 206 with Content-Range", async () => {
    await fc.assert(
      fc.asyncProperty(
        arbAudioFilename,
        arbOwnerId,
        arbSongId,
        async (filename, ownerId, songId) => {
          vi.clearAllMocks();
          setupMocksForAuthorized("owner", "audio", filename, ownerId, "irrelevant", songId);

          const fileSize = FAKE_AUDIO_CONTENT.length;
          // Request first 10 bytes
          const rangeEnd = Math.min(9, fileSize - 1);
          const req = makeRequest("GET", `/api/uploads/audio/${filename}`, {
            Range: `bytes=0-${rangeEnd}`,
          });
          const params = makeParams([filename]);
          const response = await audioGET(req, params);

          expect(response.status).toBe(206);
          expect(response.headers.get("Content-Range")).toBe(
            `bytes 0-${rangeEnd}/${fileSize}`
          );
          expect(response.headers.get("Content-Type")).toBe("audio/mpeg");
          expect(response.headers.get("Accept-Ranges")).toBe("bytes");
          expect(response.headers.get("Cache-Control")).toBe(
            "public, max-age=31536000, immutable"
          );
        }
      ),
      { numRuns: 30 }
    );
  });

  /**
   * Property 2.5: GET for non-existent audio file (no DB entry) returns 403.
   *
   * Post-fix behavior: orphaned files without a DB entry are denied access (403)
   * by resolveUploadAccess before file existence is checked, because the
   * conservative approach returns { allowed: false } when no AudioQuelle is found.
   *
   * **Validates: Requirements 3.8**
   */
  it("GET for non-existent audio file without DB entry returns 403 (access denied before file check)", async () => {
    await fc.assert(
      fc.asyncProperty(
        arbAudioFilename,
        arbOwnerId,
        async (filename, ownerId) => {
          vi.clearAllMocks();
          setupMocksForNonExistentFile(ownerId, "audio", filename);

          const req = makeRequest("GET", `/api/uploads/audio/${filename}`);
          const params = makeParams([filename]);
          const response = await audioGET(req, params);

          expect(response.status).toBe(403);
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property 2.6: GET for non-existent cover file (no DB entry) returns 403.
   *
   * Post-fix behavior: orphaned files without a DB entry are denied access (403)
   * by resolveUploadAccess before file existence is checked, because the
   * conservative approach returns { allowed: false } when no Song is found.
   *
   * **Validates: Requirements 3.8**
   */
  it("GET for non-existent cover file without DB entry returns 403 (access denied before file check)", async () => {
    await fc.assert(
      fc.asyncProperty(
        arbCoverFilename,
        arbOwnerId,
        async (filename, ownerId) => {
          vi.clearAllMocks();
          setupMocksForNonExistentFile(ownerId, "covers", filename);

          const req = makeRequest("GET", `/api/uploads/covers/${filename}`);
          const params = makeParams([filename]);
          const response = await coversGET(req, params);

          expect(response.status).toBe(403);
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property 2.7: Combined – For all authorized requests (owner or Freigabe
   * recipient) × (audio / covers) × (GET / HEAD / Range-GET), response status,
   * Content-Type, Cache-Control headers, and file content match observed behavior.
   *
   * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
   */
  it("all authorized request combinations return correct status, Content-Type, and Cache-Control", async () => {
    await fc.assert(
      fc.asyncProperty(
        arbAuthRole,
        arbEndpointType,
        arbRequestType,
        arbAudioFilename,
        arbCoverFilename,
        arbOwnerId,
        arbFreigabeUserId,
        arbSongId,
        async (
          role,
          endpointType,
          requestType,
          audioFilename,
          coverFilename,
          ownerId,
          freigabeUserId,
          songId
        ) => {
          // HEAD and RANGE-GET only apply to audio endpoint
          if (endpointType === "covers" && requestType !== "GET") return;

          vi.clearAllMocks();

          const filename = endpointType === "audio" ? audioFilename : coverFilename;
          setupMocksForAuthorized(role, endpointType, filename, ownerId, freigabeUserId, songId);

          const expectedContentType =
            endpointType === "audio" ? "audio/mpeg" : "image/jpeg";
          const expectedContent =
            endpointType === "audio" ? FAKE_AUDIO_CONTENT : FAKE_COVER_CONTENT;

          let response: Response;

          if (requestType === "HEAD") {
            const req = makeRequest("HEAD", `/api/uploads/${endpointType}/${filename}`);
            const params = makeParams([filename]);
            response = await audioHEAD(req, params);

            expect(response.status).toBe(200);
            expect(response.headers.get("Content-Type")).toBe(expectedContentType);
            expect(response.headers.get("Content-Length")).toBe(
              String(expectedContent.length)
            );
            expect(response.headers.get("Accept-Ranges")).toBe("bytes");
          } else if (requestType === "RANGE-GET") {
            const fileSize = expectedContent.length;
            const rangeEnd = Math.min(9, fileSize - 1);
            const req = makeRequest("GET", `/api/uploads/${endpointType}/${filename}`, {
              Range: `bytes=0-${rangeEnd}`,
            });
            const params = makeParams([filename]);
            response = await audioGET(req, params);

            expect(response.status).toBe(206);
            expect(response.headers.get("Content-Range")).toBe(
              `bytes 0-${rangeEnd}/${fileSize}`
            );
            expect(response.headers.get("Content-Type")).toBe(expectedContentType);
          } else {
            // Regular GET
            const req = makeRequest("GET", `/api/uploads/${endpointType}/${filename}`);
            const params = makeParams([filename]);

            if (endpointType === "audio") {
              response = await audioGET(req, params);
            } else {
              response = await coversGET(req, params);
            }

            expect(response.status).toBe(200);
            expect(response.headers.get("Content-Type")).toBe(expectedContentType);
            expect(response.headers.get("Content-Length")).toBe(
              String(expectedContent.length)
            );
          }

          // All authorized responses should have Cache-Control
          expect(response!.headers.get("Cache-Control")).toBe(
            "public, max-age=31536000, immutable"
          );
        }
      ),
      { numRuns: 50 }
    );
  });
});
