/**
 * Property 7: Import-Pipeline verarbeitet Lyrics korrekt
 *
 * Für jeden gültigen Lyrics-Rohtext mit mindestens einer Strophe:
 * Song wird mit korrektem Titel, Künstler und geparsten Strophen gespeichert.
 *
 * Feature: genius-song-import, Property 7: Import-Pipeline verarbeitet Lyrics korrekt
 *
 * **Validates: Requirements 3.3, 3.4**
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";
import { NextRequest } from "next/server";
import { parseSongtext } from "@/lib/import/songtext-parser";
import { isNoiseLine } from "@/lib/import/noise-filter";

// --- Mock auth to return a valid session ---
const { mockAuth } = vi.hoisted(() => {
  const _mockAuth = vi.fn().mockResolvedValue({
    user: { id: "test-user-1", email: "test@example.com" },
  });
  return { mockAuth: _mockAuth };
});

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

// --- Mock getUserApiKey to return a valid key ---
const { mockGetUserApiKey } = vi.hoisted(() => {
  const _mockGetUserApiKey = vi
    .fn()
    .mockResolvedValue("valid-genius-api-key-12345");
  return { mockGetUserApiKey: _mockGetUserApiKey };
});

vi.mock("@/lib/genius/api-key-store", () => ({
  getUserApiKey: mockGetUserApiKey,
}));

// --- Mock fetchLyrics to return the generated valid lyrics ---
const { mockFetchLyrics } = vi.hoisted(() => {
  const _mockFetchLyrics = vi.fn();
  return { mockFetchLyrics: _mockFetchLyrics };
});

vi.mock("@/lib/genius/client", () => ({
  fetchLyrics: mockFetchLyrics,
}));

// --- Mock importSong to capture what it receives ---
const { mockImportSong } = vi.hoisted(() => {
  const _mockImportSong = vi.fn();
  return { mockImportSong: _mockImportSong };
});

vi.mock("@/lib/services/song-service", () => ({
  importSong: mockImportSong,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {},
}));

// --- Import route handler ---
import { POST } from "@/app/api/songs/genius/import/route";

// --- Helpers ---
function makeImportRequest(body: unknown): NextRequest {
  return new NextRequest(
    new URL("/api/songs/genius/import", "http://localhost:3000"),
    {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    }
  );
}

// --- Section names commonly found in Genius lyrics ---
const SECTION_NAMES = [
  "Verse 1",
  "Verse 2",
  "Verse 3",
  "Chorus",
  "Bridge",
  "Intro",
  "Outro",
  "Pre-Chorus",
  "Hook",
  "Refrain",
];

/**
 * Generates a non-empty content line that is NOT a noise line and NOT a section marker.
 * Uses array of characters joined together since fc.stringOf is not available in fast-check v4.
 */
const SAFE_CHARS = "abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const contentLineArb = fc
  .array(fc.constantFrom(...SAFE_CHARS), { minLength: 2, maxLength: 40 })
  .map((chars) => chars.join(""))
  .filter((s) => {
    const trimmed = s.trim();
    return (
      trimmed.length > 0 &&
      !isNoiseLine(trimmed) &&
      !/^\[.*\]$/.test(trimmed)
    );
  });

/**
 * Generates a single stanza: a [SectionName] marker followed by 1-5 content lines.
 */
const stanzaArb = fc
  .tuple(
    fc.constantFrom(...SECTION_NAMES),
    fc.array(contentLineArb, { minLength: 1, maxLength: 5 })
  )
  .map(([sectionName, lines]) => ({
    sectionName,
    lines,
    raw: [`[${sectionName}]`, ...lines].join("\n"),
  }));

/**
 * Generates valid lyrics with at least one stanza containing [Section] markers.
 */
const validLyricsArb = fc
  .array(stanzaArb, { minLength: 1, maxLength: 5 })
  .map((stanzas) => ({
    stanzas,
    rawLyrics: stanzas.map((s) => s.raw).join("\n\n"),
  }));

/** Valid import request body */
const importBodyArb = fc.record({
  geniusId: fc.integer({ min: 1, max: 999999 }),
  title: fc.string({ minLength: 1, maxLength: 80 }).filter((s) => s.trim().length > 0),
  artist: fc.string({ minLength: 1, maxLength: 80 }).filter((s) => s.trim().length > 0),
  geniusUrl: fc.constant("https://genius.com/some-song-lyrics"),
});

describe("Feature: genius-song-import, Property 7: Import-Pipeline verarbeitet Lyrics korrekt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      user: { id: "test-user-1", email: "test@example.com" },
    });
    mockGetUserApiKey.mockResolvedValue("valid-genius-api-key-12345");
    mockImportSong.mockResolvedValue({
      id: "mock-song-id",
      titel: "mock",
      kuenstler: "mock",
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
  });

  it("Für jeden gültigen Lyrics-Rohtext mit mindestens einer Strophe: Song wird mit korrektem Titel, Künstler und geparsten Strophen gespeichert", () => {
    return fc.assert(
      fc.asyncProperty(
        importBodyArb,
        validLyricsArb,
        async (body, { rawLyrics }) => {
          // Reset mocks between iterations
          mockImportSong.mockClear();
          mockFetchLyrics.mockReset();
          mockFetchLyrics.mockResolvedValue(rawLyrics);
          mockImportSong.mockResolvedValue({
            id: "mock-song-id",
            titel: "mock",
            kuenstler: "mock",
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

          const request = makeImportRequest(body);
          const response = await POST(request);

          // Should succeed with 201
          expect(response.status).toBe(201);

          // importSong should have been called exactly once
          expect(mockImportSong).toHaveBeenCalledOnce();

          const [userId, songInput] = mockImportSong.mock.calls[0];

          // Verify userId
          expect(userId).toBe("test-user-1");

          // Verify title and artist are passed through from the request body
          expect(songInput.titel).toBe(body.title);
          expect(songInput.kuenstler).toBe(body.artist);

          // Compute expected strophes by running the same pipeline
          const filteredLyrics = rawLyrics
            .split("\n")
            .filter((line: string) => !isNoiseLine(line))
            .join("\n");
          const parsed = parseSongtext(filteredLyrics);

          // Verify strophe count matches
          expect(songInput.strophen.length).toBe(parsed.strophen.length);

          // Verify each strophe name and lines
          for (let i = 0; i < parsed.strophen.length; i++) {
            expect(songInput.strophen[i].name).toBe(parsed.strophen[i].name);
            const expectedZeilen = parsed.strophen[i].zeilen.map(
              (z: string) => ({ text: z })
            );
            expect(songInput.strophen[i].zeilen).toEqual(expectedZeilen);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
