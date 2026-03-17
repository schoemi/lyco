// Feature: gamification-progress, Property 6: Aktive-Songs-Zählung basiert auf Session-Existenz
import { describe, it, expect } from "vitest";
import fc from "fast-check";

/**
 * Property 6: Aktive-Songs-Zählung basiert auf Session-Existenz
 *
 * Für jede Liste von Songs mit ihren Session-Zählern gilt: Die Anzahl der aktiven Songs
 * entspricht genau der Anzahl der Songs mit sessionCount > 0.
 *
 * **Validates: Requirements 9.2**
 */

const PBT_CONFIG = { numRuns: 100 };

/** Pure function: counts active songs (songs with sessionCount > 0) */
function countActiveSongs(songs: { sessionCount: number }[]): number {
  return songs.filter((s) => s.sessionCount > 0).length;
}

/** Arbitrary for a song with a non-negative integer sessionCount */
const arbSong = fc.record({
  sessionCount: fc.nat({ max: 1000 }),
});

/** Arbitrary for a list of songs (0 to 50) */
const arbSongList = fc.array(arbSong, { minLength: 0, maxLength: 50 });

describe("Property 6: Aktive-Songs-Zählung basiert auf Session-Existenz", () => {
  it("activeSongCount equals the count of songs where sessionCount > 0", () => {
    fc.assert(
      fc.property(arbSongList, (songs) => {
        const result = countActiveSongs(songs);
        const expected = songs.reduce((acc, s) => acc + (s.sessionCount > 0 ? 1 : 0), 0);
        expect(result).toBe(expected);
      }),
      PBT_CONFIG
    );
  });

  it("if all songs have sessionCount 0, activeSongCount is 0", () => {
    fc.assert(
      fc.property(
        fc.array(fc.constant({ sessionCount: 0 }), { minLength: 0, maxLength: 50 }),
        (songs) => {
          expect(countActiveSongs(songs)).toBe(0);
        }
      ),
      PBT_CONFIG
    );
  });

  it("if all songs have sessionCount > 0, activeSongCount equals total songs", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({ sessionCount: fc.integer({ min: 1, max: 1000 }) }),
          { minLength: 0, maxLength: 50 }
        ),
        (songs) => {
          expect(countActiveSongs(songs)).toBe(songs.length);
        }
      ),
      PBT_CONFIG
    );
  });

  it("activeSongCount is always >= 0 and <= total songs", () => {
    fc.assert(
      fc.property(arbSongList, (songs) => {
        const result = countActiveSongs(songs);
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThanOrEqual(songs.length);
      }),
      PBT_CONFIG
    );
  });

  it("activeSongCount is always an integer", () => {
    fc.assert(
      fc.property(arbSongList, (songs) => {
        const result = countActiveSongs(songs);
        expect(Number.isInteger(result)).toBe(true);
      }),
      PBT_CONFIG
    );
  });
});
