/**
 * Feature: song-export
 * Property 1: ChordPro Round-Trip
 *
 * Für beliebige SongExportData mit allen Optionen aktiviert:
 * parse(format(song)) ≅ song
 *
 * Prüft: Titel, Künstler, Strophen-Namen, Strophen-Reihenfolge,
 * Zeilen-Texte, Zeilen-Reihenfolge, Markup-Typen/Werte,
 * istInstrumental, istKommentar, Übersetzungen
 *
 * **Validates: Requirements 5.1, 5.2, 5.3, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6**
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { formatChordPro } from "@/lib/export/formatters/chordpro-formatter";
import { parseChordPro } from "@/lib/export/parsers/chordpro-parser";
import { VOCAL_TAG_TYPES } from "@/lib/export/export-types";
import type {
  SongExportData,
  ExportOptions,
  ExportStropheData,
  ExportZeileData,
  ExportMarkupData,
} from "@/lib/export/export-types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** All options enabled — nothing filtered, full round-trip. */
const ALL_ON: ExportOptions = {
  vocalTags: true,
  instrumental: true,
  kommentare: true, uebersetzungen: true,
};

const VOCAL_TAG_TYPEN = [
  "ATMUNG",
  "KOPFSTIMME",
  "BRUSTSTIMME",
  "BELT",
  "FALSETT",
  "PAUSE",
  "WIEDERHOLUNG",
] as const;

// ---------------------------------------------------------------------------
// Generators — tailored for round-trip correctness
// ---------------------------------------------------------------------------

/**
 * Generates text that may include `{` and `}` to test escaping/unescaping.
 * Avoids newlines (they'd break line-based parsing) and avoids producing
 * strings that look like ChordPro directives after unescaping.
 */
function arbText(minLen = 1, maxLen = 60): fc.Arbitrary<string> {
  // Base text without braces, then occasionally inject { or }
  // The parser trims lines, so we normalize: trim the result and
  // ensure no internal newlines.
  return fc
    .array(
      fc.oneof(
        { weight: 10, arbitrary: fc.integer({ min: 0x21, max: 0x7e }).filter((c) => c !== 0x7b && c !== 0x7d).map((c) => String.fromCharCode(c)) },
        { weight: 1, arbitrary: fc.constant("{") },
        { weight: 1, arbitrary: fc.constant("}") },
        { weight: 2, arbitrary: fc.constant(" ") },
      ),
      { minLength: minLen, maxLength: maxLen },
    )
    .map((chars) => chars.join("").trim())
    .filter((s) => s.length > 0);
}

/**
 * Generates a strophe-level vocal-tag markup.
 * Only strophe-level markups are generated to avoid the ambiguity
 * where vocal tags on the first zeile get merged with strophe-level
 * tags by the parser.
 */
function arbStropheVocalTag(): fc.Arbitrary<ExportMarkupData> {
  return fc.record({
    typ: fc.constantFrom(...VOCAL_TAG_TYPEN),
    ziel: fc.constant("STROPHE" as const),
    wert: fc.oneof(
      fc.constant(""),
      fc.stringMatching(/^[A-Za-z0-9 ]{1,20}$/),
    ),
    timecodeMs: fc.constant(null),
    wortIndex: fc.constant(null),
  }) as fc.Arbitrary<ExportMarkupData>;
}

/**
 * Generates a zeile suitable for round-trip testing.
 * - No zeile-level vocal tags (they'd be ambiguous on first zeile)
 * - No zeile-level markups at all (parser doesn't recover timecodeMs/wortIndex)
 * - Text may contain { and }
 */
function arbRoundTripZeile(orderIndex: number): fc.Arbitrary<ExportZeileData> {
  return fc.record({
    text: arbText(),
    uebersetzung: fc.oneof(
      fc.constant(null),
      arbText(1, 40),
    ),
    orderIndex: fc.constant(orderIndex),
    istKommentar: fc.boolean(),
    markups: fc.constant([] as ExportMarkupData[]),
  });
}

/**
 * Generates a strophe name that maps cleanly through the formatter/parser
 * section-type mapping. The parser recovers:
 * - "Chorus" for start_of_chorus
 * - "Bridge" for start_of_bridge
 * - The directive value for start_of_verse (the original name)
 * - "Instrumental" (or directive value) for start_of_tab
 *
 * To ensure round-trip, we use names that survive the mapping.
 */
function arbStropheName(istInstrumental: boolean): fc.Arbitrary<string> {
  if (istInstrumental) {
    // Instrumental strophen use start_of_tab — parser recovers "Instrumental"
    // unless a value is given. The formatter emits {start_of_tab} without value,
    // so the parser always returns "Instrumental".
    return fc.constant("Instrumental");
  }
  // Only names that survive the formatter→parser round-trip:
  // - "Chorus" → start_of_chorus → "Chorus" ✓
  // - "Bridge" → start_of_bridge → "Bridge" ✓
  // - Verse-like names (no "chorus"/"refrain"/"bridge"/"brücke" substring)
  //   → start_of_verse with value → parser recovers value ✓
  // Names like "Pre-Chorus" contain "chorus" so they map to start_of_chorus
  // but parse back as "Chorus" — NOT round-trip safe.
  return fc.oneof(
    fc.constant("Chorus"),
    fc.constant("Bridge"),
    fc.constantFrom(
      "Verse 1", "Verse 2", "Verse 3",
      "Strophe 1", "Strophe 2",
      "Intro", "Outro", "Interlude", "Hook",
    ),
  );
}

/**
 * Generates a strophe with sequential zeile orderIndex values and
 * only strophe-level vocal tags.
 */
function arbRoundTripStrophe(
  stropheOrderIndex: number,
): fc.Arbitrary<ExportStropheData> {
  return fc.boolean().chain((istInstrumental) =>
    fc
      .integer({ min: 0, max: 6 })
      .chain((zeileCount) =>
        fc.record({
          name: arbStropheName(istInstrumental),
          orderIndex: fc.constant(stropheOrderIndex),
          analyse: fc.constant(null), // parser can't recover analyse
          istInstrumental: fc.constant(istInstrumental),
          zeilen: fc.tuple(
            ...Array.from({ length: zeileCount }, (_, i) =>
              arbRoundTripZeile(i),
            ),
          ),
          markups: fc.array(arbStropheVocalTag(), {
            minLength: 0,
            maxLength: 4,
          }),
        }),
      ),
  );
}

/**
 * Generates a SongExportData suitable for ChordPro round-trip testing.
 *
 * Key constraints:
 * - Strophen have sequential orderIndex (0, 1, 2, ...)
 * - Zeilen within each strophe have sequential orderIndex (0, 1, 2, ...)
 * - Vocal tags are only at strophe level
 * - analyse is null (not recoverable from ChordPro)
 * - timecodeMs and wortIndex are null (not in ChordPro output)
 * - Text may contain { and } to test escaping
 */
export function arbRoundTripSongExportData(): fc.Arbitrary<SongExportData> {
  return fc
    .integer({ min: 0, max: 5 })
    .chain((stropheCount) =>
      fc.record({
        titel: arbText(1, 40),
        kuenstler: fc.oneof(
          fc.constant(null),
          fc.constant(""),
          arbText(1, 30),
        ),
        strophen: fc.tuple(
          ...Array.from({ length: stropheCount }, (_, i) =>
            arbRoundTripStrophe(i),
          ),
        ),
      }),
    );
}

// ---------------------------------------------------------------------------
// Normalization helpers for comparison
// ---------------------------------------------------------------------------

interface NormalizedMarkup {
  typ: string;
  wert: string;
}

interface NormalizedZeile {
  text: string;
  uebersetzung: string | null;
  istKommentar: boolean;
  markups: NormalizedMarkup[];
}

interface NormalizedStrophe {
  name: string;
  istInstrumental: boolean;
  zeilen: NormalizedZeile[];
  /** All vocal tags for this strophe (strophe-level), sorted for comparison */
  vocalTags: NormalizedMarkup[];
}

interface NormalizedSong {
  titel: string;
  kuenstler: string | null;
  strophen: NormalizedStrophe[];
}

/**
 * Normalizes a markup for comparison — only typ and wert matter.
 */
function normalizeMarkup(m: ExportMarkupData): NormalizedMarkup {
  return { typ: m.typ, wert: m.wert ?? "" };
}

/**
 * Sort markups deterministically for comparison.
 */
function sortMarkups(markups: NormalizedMarkup[]): NormalizedMarkup[] {
  return [...markups].sort((a, b) => {
    const typCmp = a.typ.localeCompare(b.typ);
    if (typCmp !== 0) return typCmp;
    return a.wert.localeCompare(b.wert);
  });
}

/**
 * Normalizes a zeile for comparison — excludes orderIndex (sequential),
 * and normalizes markups.
 */
function normalizeZeile(z: ExportZeileData): NormalizedZeile {
  return {
    text: z.text,
    uebersetzung: z.uebersetzung || null,
    istKommentar: z.istKommentar,
    markups: sortMarkups(
      z.markups
        .filter((m) => (VOCAL_TAG_TYPES as string[]).includes(m.typ))
        .map(normalizeMarkup),
    ),
  };
}

/**
 * Normalizes a strophe for comparison.
 * Collects all vocal tags (strophe-level + first-zeile-level) into one set.
 */
function normalizeStrophe(s: ExportStropheData): NormalizedStrophe {
  // Sort zeilen by orderIndex for consistent comparison
  const sortedZeilen = [...s.zeilen].sort(
    (a, b) => a.orderIndex - b.orderIndex,
  );

  // Collect all strophe-level vocal tags
  const stropheVocalTags = s.markups
    .filter((m) => (VOCAL_TAG_TYPES as string[]).includes(m.typ))
    .map(normalizeMarkup);

  return {
    name: s.name,
    istInstrumental: s.istInstrumental,
    zeilen: sortedZeilen.map(normalizeZeile),
    vocalTags: sortMarkups(stropheVocalTags),
  };
}

/**
 * Normalizes a song for comparison.
 * - Sorts strophen by orderIndex
 * - Normalizes each strophe and zeile
 * - Treats empty/null kuenstler uniformly as null
 */
function normalizeSong(song: SongExportData): NormalizedSong {
  const sortedStrophen = [...song.strophen].sort(
    (a, b) => a.orderIndex - b.orderIndex,
  );

  return {
    titel: song.titel,
    kuenstler:
      song.kuenstler != null && song.kuenstler.trim() !== ""
        ? song.kuenstler
        : null,
    strophen: sortedStrophen.map(normalizeStrophe),
  };
}

// ---------------------------------------------------------------------------
// PBT Config
// ---------------------------------------------------------------------------

const PBT_CONFIG = { numRuns: 100 };

// ---------------------------------------------------------------------------
// Property 1: ChordPro Round-Trip
// ---------------------------------------------------------------------------

describe("Property 1: ChordPro Round-Trip", () => {
  /**
   * parse(format(song)) ≅ song
   *
   * For any valid SongExportData with all options enabled,
   * formatting to ChordPro and parsing back produces a
   * semantically equivalent SongExportData.
   *
   * **Validates: Requirements 5.1, 5.2, 5.3, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6**
   */
  it("round-trip: parse(format(song)) ≅ song", () => {
    fc.assert(
      fc.property(arbRoundTripSongExportData(), (song) => {
        // Format to ChordPro
        const result = formatChordPro(song, ALL_ON);
        const chordProText = result.data.toString("utf-8");

        // Parse back
        const parsed = parseChordPro(chordProText);

        // Normalize both sides for comparison
        const normalizedOriginal = normalizeSong(song);
        const normalizedParsed = normalizeSong(parsed);

        // Compare titel
        expect(normalizedParsed.titel).toBe(normalizedOriginal.titel);

        // Compare kuenstler
        expect(normalizedParsed.kuenstler).toBe(normalizedOriginal.kuenstler);

        // Compare strophe count
        expect(normalizedParsed.strophen.length).toBe(
          normalizedOriginal.strophen.length,
        );

        // Compare each strophe
        for (let i = 0; i < normalizedOriginal.strophen.length; i++) {
          const origStrophe = normalizedOriginal.strophen[i];
          const parsedStrophe = normalizedParsed.strophen[i];

          // Strophe name
          expect(parsedStrophe.name).toBe(origStrophe.name);

          // istInstrumental
          expect(parsedStrophe.istInstrumental).toBe(
            origStrophe.istInstrumental,
          );

          // Vocal tags (strophe-level)
          expect(parsedStrophe.vocalTags).toEqual(origStrophe.vocalTags);

          // Zeile count
          expect(parsedStrophe.zeilen.length).toBe(origStrophe.zeilen.length);

          // Compare each zeile
          for (let j = 0; j < origStrophe.zeilen.length; j++) {
            const origZeile = origStrophe.zeilen[j];
            const parsedZeile = parsedStrophe.zeilen[j];

            // Text
            expect(parsedZeile.text).toBe(origZeile.text);

            // istKommentar
            expect(parsedZeile.istKommentar).toBe(origZeile.istKommentar);

            // Übersetzung
            expect(parsedZeile.uebersetzung).toBe(origZeile.uebersetzung);

            // Zeile-level markups (should be empty in our generator,
            // but verify they match)
            expect(parsedZeile.markups).toEqual(origZeile.markups);
          }
        }
      }),
      PBT_CONFIG,
    );
  });
});
