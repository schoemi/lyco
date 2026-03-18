/**
 * Property 8: Leere Lyrics ergeben HTTP 422
 *
 * Für jeden Lyrics-Text, der nach Noise-Filterung und Parsing keine gültigen
 * Strophen ergibt (leerer String, nur Whitespace, nur Noise-Zeilen), soll der
 * Import-Endpunkt den HTTP-Status 422 mit der Meldung "Keine gültigen Lyrics
 * gefunden" zurückgeben.
 *
 * Feature: genius-song-import, Property 8: Leere Lyrics ergeben HTTP 422
 *
 * **Validates: Requirements 5.3**
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";
import { NextRequest } from "next/server";

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

// --- Mock fetchLyrics to return the generated empty/noise-only lyrics ---
const { mockFetchLyrics } = vi.hoisted(() => {
  const _mockFetchLyrics = vi.fn();
  return { mockFetchLyrics: _mockFetchLyrics };
});

vi.mock("@/lib/genius/client", () => ({
  fetchLyrics: mockFetchLyrics,
}));

// --- Mock importSong to prevent DB calls ---
vi.mock("@/lib/services/song-service", () => ({
  importSong: vi.fn(),
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

// --- Noise lines that isNoiseLine() filters out ---
const NOISE_LINES = [
  "You might also like",
  "you might also like",
  "1 Embed",
  "42 Embed",
  "3 Contributors",
  "1 contributors",
  "See Beyoncé Live",
  "Get tickets as low as $50",
];

// --- Arbitraries for lyrics that produce no valid stanzas ---

/** Empty string */
const emptyStringArb = fc.constant("");

/** Whitespace-only strings (spaces, tabs, newlines) */
const whitespaceOnlyArb = fc
  .array(fc.constantFrom(" ", "\t", "\n", "\r\n", "  ", "\t\t"), {
    minLength: 1,
    maxLength: 20,
  })
  .map((parts) => parts.join(""));

/** Lines consisting only of noise patterns */
const noiseOnlyArb = fc
  .array(fc.constantFrom(...NOISE_LINES), { minLength: 1, maxLength: 10 })
  .map((lines) => lines.join("\n"));

/** Mix of whitespace and noise lines */
const whitespaceAndNoiseArb = fc
  .array(
    fc.oneof(
      fc.constantFrom(...NOISE_LINES),
      fc.constantFrom("", "   ", "\t")
    ),
    { minLength: 1, maxLength: 15 }
  )
  .map((lines) => lines.join("\n"));

/** Combined arbitrary: any lyrics text that yields no valid stanzas */
const emptyLyricsArb = fc.oneof(
  emptyStringArb,
  whitespaceOnlyArb,
  noiseOnlyArb,
  whitespaceAndNoiseArb
);

/** Valid import request body */
const importBodyArb = fc.record({
  geniusId: fc.integer({ min: 1, max: 999999 }),
  title: fc.string({ minLength: 1, maxLength: 100 }),
  artist: fc.string({ minLength: 1, maxLength: 100 }),
  geniusUrl: fc.constant("https://genius.com/some-song-lyrics"),
});

describe("Feature: genius-song-import, Property 8: Leere Lyrics ergeben HTTP 422", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      user: { id: "test-user-1", email: "test@example.com" },
    });
    mockGetUserApiKey.mockResolvedValue("valid-genius-api-key-12345");
  });

  it("Für jeden Lyrics-Text ohne gültige Strophen: HTTP 422 mit Meldung 'Keine gültigen Lyrics gefunden'", () => {
    return fc.assert(
      fc.asyncProperty(importBodyArb, emptyLyricsArb, async (body, lyrics) => {
        mockFetchLyrics.mockResolvedValue(lyrics);

        const request = makeImportRequest(body);
        const response = await POST(request);

        expect(response.status).toBe(422);

        const json = await response.json();
        expect(json.error).toBe("Keine gültigen Lyrics gefunden");
      }),
      { numRuns: 100 }
    );
  });
});
