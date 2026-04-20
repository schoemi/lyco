/**
 * Feature: song-export
 * Property 2: Format Filter Correctness
 *
 * Für beliebige SongExportData und beliebige ExportOptions prüft dieser Test:
 * - Vocal-Tags-Entfernung (vocalTags=false)
 * - Instrumental-Entfernung (instrumental=false)
 * - Kommentar-Entfernung (kommentare=false)
 * - Nicht-betroffene-Daten-Erhaltung
 *
 * **Validates: Requirements 2.3, 2.4, 2.5**
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { applyExportOptions } from "@/lib/export/format-filter";
import { VOCAL_TAG_TYPES } from "@/lib/export/export-types";
import type {
  SongExportData,
  ExportOptions,
  ExportStropheData,
  ExportZeileData,
  ExportMarkupData,
} from "@/lib/export/export-types";

// ---------------------------------------------------------------------------
// All MarkupTyp values from the Prisma schema
// ---------------------------------------------------------------------------

const ALL_MARKUP_TYPEN = [
  "PAUSE",
  "WIEDERHOLUNG",
  "ATMUNG",
  "KOPFSTIMME",
  "BRUSTSTIMME",
  "BELT",
  "FALSETT",
  "TIMECODE",
] as const;

const ALL_MARKUP_ZIELE = ["STROPHE", "ZEILE", "WORT"] as const;

// ---------------------------------------------------------------------------
// Exported Generators
// ---------------------------------------------------------------------------

/**
 * Generates a random ExportMarkupData with any MarkupTyp.
 */
function arbMarkup(): fc.Arbitrary<ExportMarkupData> {
  return fc.record({
    typ: fc.constantFrom(...ALL_MARKUP_TYPEN),
    ziel: fc.constantFrom(...ALL_MARKUP_ZIELE),
    wert: fc.option(fc.string({ minLength: 0, maxLength: 30 }), { nil: null }),
    timecodeMs: fc.option(fc.integer({ min: 0, max: 600_000 }), { nil: null }),
    wortIndex: fc.option(fc.integer({ min: 0, max: 50 }), { nil: null }),
  }) as fc.Arbitrary<ExportMarkupData>;
}

/**
 * Generates a random ExportZeileData with variable markups,
 * istKommentar flag, and optional uebersetzung.
 */
function arbZeile(): fc.Arbitrary<ExportZeileData> {
  return fc.record({
    text: fc.string({ minLength: 1, maxLength: 80 }),
    uebersetzung: fc.option(fc.string({ minLength: 1, maxLength: 80 }), { nil: null }),
    orderIndex: fc.integer({ min: 0, max: 100 }),
    istKommentar: fc.boolean(),
    markups: fc.array(arbMarkup(), { minLength: 0, maxLength: 5 }),
  });
}

/**
 * Generates a random ExportStropheData with variable zeilen, markups,
 * istInstrumental flag, and optional analyse.
 */
function arbStrophe(): fc.Arbitrary<ExportStropheData> {
  return fc.record({
    name: fc.stringMatching(/^[A-Za-z0-9 ]{1,30}$/).filter((s) => s.trim().length > 0),
    orderIndex: fc.integer({ min: 0, max: 100 }),
    analyse: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
    istInstrumental: fc.boolean(),
    zeilen: fc.array(arbZeile(), { minLength: 0, maxLength: 8 }),
    markups: fc.array(arbMarkup(), { minLength: 0, maxLength: 5 }),
  });
}

/**
 * Generates a random SongExportData with variable strophen.
 * Exported for reuse by other property tests in the song-export suite.
 */
export function arbSongExportData(): fc.Arbitrary<SongExportData> {
  return fc.record({
    titel: fc.string({ minLength: 1, maxLength: 60 }),
    kuenstler: fc.option(fc.string({ minLength: 1, maxLength: 40 }), { nil: null }),
    strophen: fc.array(arbStrophe(), { minLength: 0, maxLength: 6 }),
  });
}

/**
 * Generates a random ExportOptions combination.
 * Exported for reuse by other property tests in the song-export suite.
 */
export function arbExportOptions(): fc.Arbitrary<ExportOptions> {
  return fc.record({
    vocalTags: fc.boolean(),
    instrumental: fc.boolean(),
    kommentare: fc.boolean(),
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VOCAL_TAG_SET = new Set<string>(VOCAL_TAG_TYPES);

function isVocalTag(typ: string): boolean {
  return VOCAL_TAG_SET.has(typ);
}

/** Collect all markups from all strophen and zeilen in a song. */
function collectAllMarkups(song: SongExportData): ExportMarkupData[] {
  const result: ExportMarkupData[] = [];
  for (const strophe of song.strophen) {
    result.push(...strophe.markups);
    for (const zeile of strophe.zeilen) {
      result.push(...zeile.markups);
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// PBT Config
// ---------------------------------------------------------------------------

const PBT_CONFIG = { numRuns: 100 };

// ---------------------------------------------------------------------------
// Property 2: Format Filter Correctness
// ---------------------------------------------------------------------------

describe("Property 2: Format Filter Correctness", () => {
  /**
   * Sub-property 2a: Vocal-Tags-Entfernung
   *
   * When vocalTags=false, no Markup with typ ∈ VOCAL_TAG_TYPES remains
   * in any strophe or zeile, and all TIMECODE markups are preserved.
   *
   * **Validates: Requirements 2.3**
   */
  it("vocalTags=false removes all vocal-tag markups and preserves TIMECODE", () => {
    fc.assert(
      fc.property(arbSongExportData(), (song) => {
        const options: ExportOptions = {
          vocalTags: false,
          instrumental: true,
          kommentare: true,
        };

        const result = applyExportOptions(song, options);

        // No vocal-tag markups should remain
        const allMarkups = collectAllMarkups(result);
        for (const markup of allMarkups) {
          expect(isVocalTag(markup.typ)).toBe(false);
        }

        // All TIMECODE markups from the input should be preserved
        const inputTimecodes = collectAllMarkups(song).filter(
          (m) => m.typ === "TIMECODE",
        );
        const outputTimecodes = allMarkups.filter(
          (m) => m.typ === "TIMECODE",
        );
        expect(outputTimecodes.length).toBe(inputTimecodes.length);
      }),
      PBT_CONFIG,
    );
  });

  /**
   * Sub-property 2b: Instrumental-Entfernung
   *
   * When instrumental=false, no Strophe with istInstrumental=true remains.
   *
   * **Validates: Requirements 2.4**
   */
  it("instrumental=false removes all instrumental strophen", () => {
    fc.assert(
      fc.property(arbSongExportData(), (song) => {
        const options: ExportOptions = {
          vocalTags: true,
          instrumental: false,
          kommentare: true,
        };

        const result = applyExportOptions(song, options);

        for (const strophe of result.strophen) {
          expect(strophe.istInstrumental).toBe(false);
        }
      }),
      PBT_CONFIG,
    );
  });

  /**
   * Sub-property 2c: Kommentar-Entfernung
   *
   * When kommentare=false, no Zeile with istKommentar=true remains,
   * and all Strophe.analyse values are null.
   *
   * **Validates: Requirements 2.5**
   */
  it("kommentare=false removes all comment zeilen and nullifies analyse", () => {
    fc.assert(
      fc.property(arbSongExportData(), (song) => {
        const options: ExportOptions = {
          vocalTags: true,
          instrumental: true,
          kommentare: false,
        };

        const result = applyExportOptions(song, options);

        for (const strophe of result.strophen) {
          // analyse must be null
          expect(strophe.analyse).toBeNull();

          // no comment zeilen
          for (const zeile of strophe.zeilen) {
            expect(zeile.istKommentar).toBe(false);
          }
        }
      }),
      PBT_CONFIG,
    );
  });

  /**
   * Sub-property 2d: Nicht-betroffene-Daten-Erhaltung
   *
   * Non-targeted data (regular zeilen, non-vocal markups, non-instrumental
   * strophen) is never removed by any combination of options.
   *
   * **Validates: Requirements 2.3, 2.4, 2.5**
   */
  it("non-targeted data is preserved for any option combination", () => {
    fc.assert(
      fc.property(arbSongExportData(), arbExportOptions(), (song, options) => {
        const result = applyExportOptions(song, options);

        // Count non-instrumental strophen in input
        const inputNonInstrumental = song.strophen.filter(
          (s) => !s.istInstrumental,
        );
        const resultNonInstrumental = result.strophen.filter(
          (s) => !s.istInstrumental,
        );
        expect(resultNonInstrumental.length).toBe(inputNonInstrumental.length);

        // For each non-instrumental strophe, count non-comment zeilen
        for (let i = 0; i < inputNonInstrumental.length; i++) {
          const inputStrophe = inputNonInstrumental[i];
          const resultStrophe = resultNonInstrumental[i];

          const inputNonCommentZeilen = inputStrophe.zeilen.filter(
            (z) => !z.istKommentar,
          );
          const resultNonCommentZeilen = resultStrophe.zeilen.filter(
            (z) => !z.istKommentar,
          );
          expect(resultNonCommentZeilen.length).toBe(
            inputNonCommentZeilen.length,
          );

          // Non-vocal markups on strophe level should be preserved
          const inputNonVocalStropheMarkups = inputStrophe.markups.filter(
            (m) => !isVocalTag(m.typ),
          );
          const resultNonVocalStropheMarkups = resultStrophe.markups.filter(
            (m) => !isVocalTag(m.typ),
          );
          expect(resultNonVocalStropheMarkups.length).toBe(
            inputNonVocalStropheMarkups.length,
          );

          // Non-vocal markups on zeile level should be preserved
          // (compare across non-comment zeilen only, since comment zeilen may be removed)
          for (let j = 0; j < inputNonCommentZeilen.length; j++) {
            const inputZeile = inputNonCommentZeilen[j];
            const resultZeile = resultNonCommentZeilen[j];

            const inputNonVocalZeileMarkups = inputZeile.markups.filter(
              (m) => !isVocalTag(m.typ),
            );
            const resultNonVocalZeileMarkups = resultZeile.markups.filter(
              (m) => !isVocalTag(m.typ),
            );
            expect(resultNonVocalZeileMarkups.length).toBe(
              inputNonVocalZeileMarkups.length,
            );
          }
        }
      }),
      PBT_CONFIG,
    );
  });
});
