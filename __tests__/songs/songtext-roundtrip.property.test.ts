/**
 * Property: Round-Trip Consistency
 *
 * For every valid ParsedSong, `parseSongtext(printSongtext(parsed))` yields
 * the same structure — strophe names and zeilen arrays match.
 *
 * **Validates: Songtext Parser, Songtext Printer**
 */
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { parseSongtext } from "../../src/lib/import/songtext-parser";
import { printSongtext } from "../../src/lib/import/songtext-printer";
import type { ParsedSong, ParsedStrophe } from "../../src/types/import";

// --- Generators ---

/**
 * Simple alphanumeric strophe names like "Verse 1", "Chorus", "Bridge".
 * Avoids names containing [ or ] and noise-like patterns.
 */
const stropheNameArb = fc.constantFrom(
  "Verse 1",
  "Verse 2",
  "Verse 3",
  "Chorus",
  "Bridge",
  "Pre-Chorus",
  "Outro",
  "Intro",
  "Hook",
  "Refrain"
);

/**
 * A single lyric line: non-empty alphanumeric string that won't be
 * mistaken for noise or a section marker.
 */
const zeileArb = fc
  .stringMatching(/^[A-Za-z ]{1,40}$/)
  .filter((s) => s.trim().length > 0)
  .map((s) => s.trim());

/**
 * A strophe with a valid name and at least 1 zeile.
 */
const stropheArb: fc.Arbitrary<ParsedStrophe> = fc.record({
  name: stropheNameArb,
  zeilen: fc.array(zeileArb, { minLength: 1, maxLength: 5 }),
});

/**
 * A valid ParsedSong with at least 1 strophe.
 */
const parsedSongArb: fc.Arbitrary<ParsedSong> = fc.record({
  strophen: fc.array(stropheArb, { minLength: 1, maxLength: 5 }),
});

// --- Property Test ---

describe("Property: Songtext Round-Trip Consistency", () => {
  it("parseSongtext(printSongtext(song)) yields the same strophe names and zeilen", () => {
    fc.assert(
      fc.property(parsedSongArb, (original) => {
        const printed = printSongtext(original);
        const reparsed = parseSongtext(printed);

        // Same number of strophes
        expect(reparsed.strophen).toHaveLength(original.strophen.length);

        for (let i = 0; i < original.strophen.length; i++) {
          // Strophe names match
          expect(reparsed.strophen[i].name).toBe(original.strophen[i].name);

          // Zeilen arrays match
          expect(reparsed.strophen[i].zeilen).toEqual(
            original.strophen[i].zeilen
          );
        }
      }),
      { numRuns: 100 }
    );
  });
});
