/**
 * Property 2: Album-Art-URL wird als coverUrl persistiert
 *
 * - Für jeden Import mit `albumArt`-URL: Song hat `coverUrl` gesetzt
 * - Für jeden Import ohne `albumArt`: Song hat `coverUrl === null`
 *
 * **Validates: Requirements 3.1, 3.2**
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";
import { NextRequest } from "next/server";

// --- Hoisted mocks ---
const { mockAuth, mockGetUserApiKey, mockFetchLyrics, mockImportSong } =
  vi.hoisted(() => ({
    mockAuth: vi.fn(),
    mockGetUserApiKey: vi.fn(),
    mockFetchLyrics: vi.fn(),
    mockImportSong: vi.fn(),
  }));

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/genius/api-key-store", () => ({
  getUserApiKey: mockGetUserApiKey,
}));
vi.mock("@/lib/genius/client", () => ({ fetchLyrics: mockFetchLyrics }));
vi.mock("@/lib/import/noise-filter", () => ({
  isNoiseLine: () => false,
}));
vi.mock("@/lib/import/songtext-parser", () => ({
  parseSongtext: () => ({
    strophen: [{ name: "Verse 1", zeilen: ["Test line"] }],
  }),
}));
vi.mock("@/lib/services/song-service", () => ({
  importSong: mockImportSong,
}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { POST } from "@/app/api/songs/genius/import/route";

// --- Constants ---
const TEST_USER_ID = "user-prop-test";

// --- Helpers ---
function setupMocks() {
  mockAuth.mockResolvedValue({ user: { id: TEST_USER_ID } });
  mockGetUserApiKey.mockResolvedValue("test-api-key");
  mockFetchLyrics.mockResolvedValue("[Verse 1]\nSome lyrics line");
  mockImportSong.mockResolvedValue({
    id: "song-1",
    titel: "Test",
    kuenstler: null,
    sprache: null,
    emotionsTags: [],
    coverUrl: null,
    progress: 0,
    sessionCount: 0,
    analyse: null,
    coachTipp: null,
    strophen: [],
    audioQuellen: [],
  });
}

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest(
    new URL("/api/songs/genius/import", "http://localhost:3000"),
    {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    },
  );
}

// --- Generators ---

/** Valid HTTP(S) album art URLs */
const albumArtUrlArb = fc.oneof(
  fc.webUrl().map((url) => url.replace(/^http:/, "https:")),
  fc.constant("https://images.genius.com/cover123.jpg"),
  fc.constant("https://example.com/art.png"),
);

/** Song title – non-empty printable string */
const titleArb = fc
  .stringMatching(/^[A-Za-z0-9 ]{1,30}$/)
  .filter((s) => s.trim().length > 0);

/** Artist name */
const artistArb = fc
  .stringMatching(/^[A-Za-z0-9 ]{1,20}$/)
  .filter((s) => s.trim().length > 0);

/** Genius ID */
const geniusIdArb = fc.integer({ min: 1, max: 999999 });

/** Base request body (without albumArt) */
const baseBodyArb = fc.record({
  geniusId: geniusIdArb,
  title: titleArb,
  artist: artistArb,
  geniusUrl: fc.constant("https://genius.com/test-lyrics"),
});

describe("Property 2: Album-Art-URL wird als coverUrl persistiert", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  it("imports with albumArt pass coverUrl to importSong", async () => {
    await fc.assert(
      fc.asyncProperty(
        baseBodyArb,
        albumArtUrlArb,
        async (baseBody, albumArt) => {
          vi.clearAllMocks();
          setupMocks();

          const body = { ...baseBody, albumArt };
          const request = makeRequest(body);
          const response = await POST(request);

          expect(response.status).toBe(201);
          expect(mockImportSong).toHaveBeenCalledOnce();

          const [userId, importData] = mockImportSong.mock.calls[0];
          expect(userId).toBe(TEST_USER_ID);
          expect(importData.coverUrl).toBe(albumArt);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("imports without albumArt pass undefined coverUrl to importSong", async () => {
    await fc.assert(
      fc.asyncProperty(baseBodyArb, async (baseBody) => {
        vi.clearAllMocks();
        setupMocks();

        // Body explicitly without albumArt
        const { ...body } = baseBody;
        const request = makeRequest(body);
        const response = await POST(request);

        expect(response.status).toBe(201);
        expect(mockImportSong).toHaveBeenCalledOnce();

        const [, importData] = mockImportSong.mock.calls[0];
        // When albumArt is not provided, coverUrl should be undefined
        // importSong then stores it as null via `data.coverUrl ?? null`
        expect(importData.coverUrl).toBeUndefined();
      }),
      { numRuns: 100 },
    );
  });
});
