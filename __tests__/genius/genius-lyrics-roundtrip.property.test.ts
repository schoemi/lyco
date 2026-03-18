/**
 * Feature: genius-song-import, Property 10: Lyrics-Parsing Round-Trip
 *
 * For every valid parsed song with Genius-style [Section] markers:
 * 1. Noise lines injected into the raw lyrics are properly filtered
 * 2. `parseSongtext(printSongtext(song))` yields the same strophe names and zeilen arrays
 *
 * **Validates: Requirements 6.4**
 */
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { parseSongtext } from "../../src/lib/import/songtext-parser";
import { printSongtext } from "../../src/lib/import/songtext-printer";
import { isNoiseLine } from "../../src/lib/import/noise-filter";
import type { ParsedSong, ParsedStrophe } from "../../src/types/import";

// --- Noise lines that Genius pages commonly inject ---

const GENIUS_NOISE_LINES = [
  "You might also like",
  "42 Embed",
  "1 Embed",
  "999 Contributors",
  "3 contributors",
  "See Green Day Live",
  "Get tickets as low as $20",
];

// --- Generators ---

/** Genius-style section names with [Section] markers */
const geniusSectionNameArb = fc.constantFrom(
  "Verse 1",
  "Verse 2",
  "Verse 3",
  "Chorus",
  "Bridge",
  "Pre-Chorus",
  "Outro",
  "Intro",
  "Hook",
  "Refrain",
  "Post-Chorus",
  "Verse",
);

/**
 * A single lyric line: non-empty alphabetic string that won't be
 * mistaken for noise or a section marker.
 */
const zeileArb = fc
  .stringMatching(/^[A-Za-z ]{1,40}$/)
  .filter((s) => s.trim().length > 0)
  .map((s) => s.trim());

/** A strophe with a valid Genius section name and 1-5 lyric lines */
const stropheArb: fc.Arbitrary<ParsedStrophe> = fc.record({
  name: geniusSectionNameArb,
  zeilen: fc.array(zeileArb, { minLength: 1, maxLength: 5 }),
});

/** A valid ParsedSong with 1-5 strophes */
const parsedSongArb: fc.Arbitrary<ParsedSong> = fc.record({
  strophen: fc.array(stropheArb, { minLength: 1, maxLength: 5 }),
});

/** Random noise lines to inject between strophes */
const noiseLineArb = fc.constantFrom(...GENIUS_NOISE_LINES);

/** Array of 0-3 noise lines */
const noiseBlockArb = fc.array(noiseLineArb, { minLength: 0, maxLength: 3 });

// --- Helpers ---

/**
 * Builds raw Genius-style lyrics text from a ParsedSong, injecting
 * noise lines between strophes to simulate real Genius page output.
 */
function buildGeniusRawLyrics(
  song: ParsedSong,
  noiseBlocks: string[][]
): string {
  const parts: string[] = [];

  for (let i = 0; i < song.strophen.length; i++) {
    // Inject noise before each strophe (if available)
    if (i < noiseBlocks.length && noiseBlocks[i].length > 0) {
      parts.push(noiseBlocks[i].join("\n"));
    }

    const strophe = song.strophen[i];
    parts.push([`[${strophe.name}]`, ...strophe.zeilen].join("\n"));
  }

  // Optionally inject trailing noise
  const trailingIdx = song.strophen.length;
  if (trailingIdx < noiseBlocks.length && noiseBlocks[trailingIdx].length > 0) {
    parts.push(noiseBlocks[trailingIdx].join("\n"));
  }

  return parts.join("\n\n");
}

// --- Property Tests ---

describe("Feature: genius-song-import, Property 10: Lyrics-Parsing Round-Trip", () => {
  it("parseSongtext(printSongtext(song)) yields the same strophe names and zeilen for Genius-style lyrics", () => {
    fc.assert(
      fc.property(parsedSongArb, (original) => {
        const printed = printSongtext(original);
        const reparsed = parseSongtext(printed);

        expect(reparsed.strophen).toHaveLength(original.strophen.length);

        for (let i = 0; i < original.strophen.length; i++) {
          expect(reparsed.strophen[i].name).toBe(original.strophen[i].name);
          expect(reparsed.strophen[i].zeilen).toEqual(
            original.strophen[i].zeilen
          );
        }
      }),
      { numRuns: 100 }
    );
  });

  it("noise lines injected into Genius-style lyrics are filtered before parsing, preserving round-trip", () => {
    fc.assert(
      fc.property(
        parsedSongArb,
        // Generate one noise block per strophe + one trailing
        fc.array(noiseBlockArb, { minLength: 1, maxLength: 6 }),
        (original, noiseBlocks) => {
          // Build raw Genius lyrics with noise injected
          const rawWithNoise = buildGeniusRawLyrics(original, noiseBlocks);

          // Verify noise lines are detected by isNoiseLine
          const allNoiseLines = noiseBlocks.flat();
          for (const noiseLine of allNoiseLines) {
            expect(isNoiseLine(noiseLine)).toBe(true);
          }

          // Parse the noisy raw text (parser internally filters noise)
          const parsed = parseSongtext(rawWithNoise);

          // The parsed result should match the original structure
          expect(parsed.strophen).toHaveLength(original.strophen.length);

          for (let i = 0; i < original.strophen.length; i++) {
            expect(parsed.strophen[i].name).toBe(original.strophen[i].name);
            expect(parsed.strophen[i].zeilen).toEqual(
              original.strophen[i].zeilen
            );
          }

          // Now do the full round-trip: print and re-parse
          const printed = printSongtext(parsed);
          const reparsed = parseSongtext(printed);

          expect(reparsed.strophen).toHaveLength(original.strophen.length);

          for (let i = 0; i < original.strophen.length; i++) {
            expect(reparsed.strophen[i].name).toBe(original.strophen[i].name);
            expect(reparsed.strophen[i].zeilen).toEqual(
              original.strophen[i].zeilen
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
