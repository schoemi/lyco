/**
 * Property 4: Suchergebnis-Begrenzung auf maximal 10
 *
 * Für jede Suchanfrage an den Genius-Client soll die zurückgegebene
 * Ergebnisliste maximal 10 Einträge enthalten.
 *
 * Feature: genius-song-import, Property 4: Suchergebnis-Begrenzung auf maximal 10
 *
 * **Validates: Requirements 7.4**
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";

// Mock global fetch before importing the client
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { searchSongs } from "@/lib/genius/client";

/**
 * Generates a fake Genius API hit matching the response shape
 * from the Genius search API.
 */
const arbGeniusHit = fc.record({
  id: fc.integer({ min: 1, max: 999999 }),
  full_title: fc.string({ minLength: 1, maxLength: 80 }),
  url: fc.constant("https://genius.com/some-song"),
  song_art_image_url: fc.constant("https://images.genius.com/cover.jpg"),
});

/** Helper to create a mock fetch Response for the Genius search API */
function mockSearchResponse(hits: Array<{ id: number; full_title: string; url: string; song_art_image_url: string }>) {
  return {
    ok: true,
    json: () => Promise.resolve({
      response: {
        hits: hits.map((h) => ({ result: h })),
      },
    }),
  };
}

describe("Feature: genius-song-import, Property 4: Suchergebnis-Begrenzung auf maximal 10", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("searchSongs returns at most 10 results for any number of API results (0..50+)", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbGeniusHit, { minLength: 0, maxLength: 60 }),
        fc.string({ minLength: 1, maxLength: 100 }),
        async (apiHits, query) => {
          mockFetch.mockResolvedValueOnce(mockSearchResponse(apiHits));

          const results = await searchSongs(query, "test-api-key");

          expect(results.length).toBeLessThanOrEqual(10);
          // Verify we get the correct count when API returns fewer than 10
          expect(results.length).toBe(Math.min(apiHits.length, 10));
        }
      ),
      { numRuns: 100 }
    );
  });

  it("searchSongs returns empty array when API returns no hits", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }),
        async (query) => {
          mockFetch.mockResolvedValueOnce(mockSearchResponse([]));

          const results = await searchSongs(query, "test-api-key");

          expect(results).toEqual([]);
          expect(results.length).toBe(0);
          expect(results.length).toBeLessThanOrEqual(10);
        }
      ),
      { numRuns: 100 }
    );
  });
});
