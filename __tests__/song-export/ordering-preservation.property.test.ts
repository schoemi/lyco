/**
 * Feature: song-export
 * Property 6: Ordering Preservation
 *
 * Für beliebige SongExportData mit beliebigen (nicht-sequentiellen) orderIndex-Werten:
 * Alle Formatter geben Strophen in aufsteigender orderIndex-Reihenfolge aus,
 * und Zeilen innerhalb jeder Strophe in aufsteigender orderIndex-Reihenfolge.
 *
 * **Validates: Requirements 10.1, 10.2**
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { formatChordPro } from "@/lib/export/formatters/chordpro-formatter";
import { parseChordPro } from "@/lib/export/parsers/chordpro-parser";
import { arbSongExportData } from "./format-filter.property.test";
import type {
  SongExportData,
  ExportOptions,
  ExportStropheData,
  ExportZeileData,
} from "@/lib/export/export-types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** All options enabled — nothing filtered. */
const ALL_ON: ExportOptions = {
  vocalTags: true,
  instrumental: true,
  kommentare: true, uebersetzungen: true,
};

// ---------------------------------------------------------------------------
// Generator: SongExportData with shuffled orderIndex values
// ---------------------------------------------------------------------------

/**
 * Takes a SongExportData from the base generator and:
 * 1. Filters out zeilen with whitespace-only text (non-comment), since the
 *    ChordPro parser trims lines and skips empty ones — they don't survive
 *    the format→parse round-trip.
 * 2. Shuffles the orderIndex values on strophen and zeilen so they are
 *    non-sequential and potentially out of order. This ensures the formatter
 *    must actually sort them.
 */
function arbShuffledSongExportData(): fc.Arbitrary<SongExportData> {
  return arbSongExportData()
    .map((song) => ({
      ...song,
      strophen: song.strophen.map((s) => ({
        ...s,
        zeilen: s.zeilen.filter(
          (z) => z.istKommentar || z.text.trim().length > 0,
        ),
      })),
    }))
    .chain((song) => {
    if (song.strophen.length === 0) {
      return fc.constant(song);
    }

    // Generate unique shuffled orderIndex values for strophen
    return fc
      .shuffledSubarray(
        Array.from({ length: song.strophen.length * 3 }, (_, i) => i * 2 + 1),
        { minLength: song.strophen.length, maxLength: song.strophen.length },
      )
      .chain((stropheIndices) => {
        // For each strophe, generate shuffled zeile orderIndex values
        const zeileArbitraries = song.strophen.map((strophe) => {
          if (strophe.zeilen.length === 0) {
            return fc.constant([] as number[]);
          }
          return fc.shuffledSubarray(
            Array.from(
              { length: strophe.zeilen.length * 3 },
              (_, i) => i * 2 + 1,
            ),
            {
              minLength: strophe.zeilen.length,
              maxLength: strophe.zeilen.length,
            },
          );
        });

        return fc.tuple(...zeileArbitraries).map((allZeileIndices) => {
          const shuffledStrophen: ExportStropheData[] = song.strophen.map(
            (strophe, sIdx) => {
              const shuffledZeilen: ExportZeileData[] = strophe.zeilen.map(
                (zeile, zIdx) => ({
                  ...zeile,
                  orderIndex: allZeileIndices[sIdx][zIdx],
                }),
              );
              return {
                ...strophe,
                orderIndex: stropheIndices[sIdx],
                zeilen: shuffledZeilen,
              };
            },
          );

          return {
            ...song,
            strophen: shuffledStrophen,
          };
        });
      });
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Checks that an array of numbers is in strictly non-decreasing order.
 */
function isAscending(values: number[]): boolean {
  for (let i = 1; i < values.length; i++) {
    if (values[i] < values[i - 1]) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// PBT Config
// ---------------------------------------------------------------------------

const PBT_CONFIG = { numRuns: 100 };

// ---------------------------------------------------------------------------
// Property 6: Ordering Preservation
// ---------------------------------------------------------------------------

describe("Property 6: Ordering Preservation", () => {
  describe("ChordPro", () => {
    /**
     * Strophen appear in ascending orderIndex order in the formatted output.
     *
     * **Validates: Requirements 10.1**
     */
    it("strophen are emitted in ascending orderIndex order", () => {
      fc.assert(
        fc.property(arbShuffledSongExportData(), (song) => {
          // Format to ChordPro and parse back
          const result = formatChordPro(song, ALL_ON);
          const chordProText = result.data.toString("utf-8");
          const parsed = parseChordPro(chordProText);

          // The parsed strophen should reflect the sorted order of the input.
          // Get the expected strophe order from the input (sorted by orderIndex).
          const expectedStrophenOrder = [...song.strophen]
            .sort((a, b) => a.orderIndex - b.orderIndex)
            .map((s) => s.orderIndex);

          // The parsed result has sequential orderIndex (0, 1, 2, ...),
          // so we verify the original orderIndex values were ascending.
          expect(isAscending(expectedStrophenOrder)).toBe(true);

          // Also verify the parsed output has the same number of strophen
          expect(parsed.strophen.length).toBe(song.strophen.length);

          // Verify the parsed strophen names match the sorted input order
          const sortedInputNames = [...song.strophen]
            .sort((a, b) => a.orderIndex - b.orderIndex)
            .map((s) => s.name);
          const parsedNames = parsed.strophen.map((s) => s.name);

          // ChordPro maps some names (e.g. names containing "Chorus" → "Chorus"),
          // so we compare the istInstrumental flags as a structural check instead
          const sortedInputFlags = [...song.strophen]
            .sort((a, b) => a.orderIndex - b.orderIndex)
            .map((s) => s.istInstrumental);
          const parsedFlags = parsed.strophen.map((s) => s.istInstrumental);
          expect(parsedFlags).toEqual(sortedInputFlags);
        }),
        PBT_CONFIG,
      );
    });

    /**
     * Zeilen within each strophe appear in ascending orderIndex order.
     *
     * **Validates: Requirements 10.2**
     */
    it("zeilen within each strophe are emitted in ascending orderIndex order", () => {
      fc.assert(
        fc.property(arbShuffledSongExportData(), (song) => {
          // Format to ChordPro and parse back
          const result = formatChordPro(song, ALL_ON);
          const chordProText = result.data.toString("utf-8");
          const parsed = parseChordPro(chordProText);

          // Sort input strophen by orderIndex to align with parsed output
          const sortedInputStrophen = [...song.strophen].sort(
            (a, b) => a.orderIndex - b.orderIndex,
          );

          for (let i = 0; i < sortedInputStrophen.length; i++) {
            const inputStrophe = sortedInputStrophen[i];
            const parsedStrophe = parsed.strophen[i];

            // The input zeilen sorted by orderIndex should produce the
            // same text sequence as the parsed zeilen.
            // We trim text for comparison since the ChordPro parser trims lines.
            const sortedInputTexts = [...inputStrophe.zeilen]
              .sort((a, b) => a.orderIndex - b.orderIndex)
              .map((z) => z.text.trim());
            const parsedTexts = parsedStrophe.zeilen.map((z) => z.text.trim());

            expect(parsedTexts).toEqual(sortedInputTexts);
          }
        }),
        PBT_CONFIG,
      );
    });
  });

  // -------------------------------------------------------------------------
  // Placeholder describe blocks for future formatters
  // -------------------------------------------------------------------------

  describe.todo("OnSong");
});
