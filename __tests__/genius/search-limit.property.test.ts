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

// Mock genius-lyrics-api before importing the client
vi.mock("genius-lyrics-api", () => ({
  searchSong: vi.fn(),
  getLyrics: vi.fn(),
}));

import { searchSongs } from "@/lib/genius/client";
import { searchSong } from "genius-lyrics-api";

const mockedSearchSong = vi.mocked(searchSong);

/**
 * Generates a fake Genius search result matching the SearchResult shape
 * from genius-lyrics-api.
 */
const arbSearchResult = fc.record({
  id: fc.integer({ min: 1, max: 999999 }),
  title: fc.string({ minLength: 1, maxLength: 80 }),
  url: fc.constant("https://genius.com/some-song"),
  albumArt: fc.constant("https://images.genius.com/cover.jpg"),
});

describe("Feature: genius-song-import, Property 4: Suchergebnis-Begrenzung auf maximal 10", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("searchSongs returns at most 10 results for any number of API results (0..50+)", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbSearchResult, { minLength: 0, maxLength: 60 }),
        fc.string({ minLength: 1, maxLength: 100 }),
        async (apiResults, query) => {
          mockedSearchSong.mockResolvedValueOnce(apiResults);

          const results = await searchSongs(query, "test-api-key");

          expect(results.length).toBeLessThanOrEqual(10);
          // Verify we get the correct count when API returns fewer than 10
          expect(results.length).toBe(Math.min(apiResults.length, 10));
        }
      ),
      { numRuns: 100 }
    );
  });

  it("searchSongs returns empty array when API returns null", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }),
        async (query) => {
          mockedSearchSong.mockResolvedValueOnce(null);

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
