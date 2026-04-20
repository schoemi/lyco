/**
 * Feature: song-export
 * Property 5: SongbookPro Formatter Structure
 *
 * Für beliebige SongExportData prüft dieser Test die strukturellen
 * Invarianten der SongbookPro-Ausgabe:
 * - Erste Zeile beginnt mit "Title: " und enthält den Song-Titel
 * - Wenn Künstler vorhanden: Zeile mit "Artist: "
 * - Wenn Künstler null/leer: keine "Artist:"-Zeile
 * - Sektions-Tags in eckigen Klammern für jede Strophe
 * - Instrumentale Strophen → "[Instrumental]"
 * - Kommentar-Zeilen mit "# "
 * - Vocal-Tag-Zeilen mit "# "
 * - Übersetzungs-Zeilen mit "↳"
 *
 * **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 11.1**
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { formatSongbookPro } from "@/lib/export/formatters/songbookpro-formatter";
import { VOCAL_TAG_TYPES } from "@/lib/export/export-types";
import type { ExportOptions, SongExportData } from "@/lib/export/export-types";
import { arbSongExportData } from "./format-filter.property.test";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** ALL_ON options ensure nothing is filtered out */
const ALL_ON: ExportOptions = {
  vocalTags: true,
  instrumental: true,
  kommentare: true,
};

const PBT_CONFIG = { numRuns: 100 };

const VOCAL_TAG_SET = new Set<string>(VOCAL_TAG_TYPES);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse the SongbookPro output into lines */
function outputLines(song: SongExportData, options: ExportOptions): string[] {
  const result = formatSongbookPro(song, options);
  return result.data.toString("utf-8").split("\n");
}

// ---------------------------------------------------------------------------
// Property 5: SongbookPro Formatter Structure
// ---------------------------------------------------------------------------

describe("Property 5: SongbookPro Formatter Structure", () => {
  /**
   * Sub-property 5a: First line starts with "Title: " and contains the song title
   *
   * **Validates: Requirements 7.1, 7.2**
   */
  it("first line starts with 'Title: ' and contains the song title", () => {
    fc.assert(
      fc.property(arbSongExportData(), (song) => {
        const lines = outputLines(song, ALL_ON);
        expect(lines[0]).toBe(`Title: ${song.titel}`);
      }),
      PBT_CONFIG,
    );
  });

  /**
   * Sub-property 5b: If artist is non-null and non-empty, there is a line starting with "Artist: "
   *
   * **Validates: Requirements 7.2**
   */
  it("if artist is non-null and non-empty, there is a line starting with 'Artist: '", () => {
    fc.assert(
      fc.property(arbSongExportData(), (song) => {
        const lines = outputLines(song, ALL_ON);
        if (song.kuenstler != null && song.kuenstler.trim() !== "") {
          const artistLine = lines.find((l) => l.startsWith("Artist: "));
          expect(artistLine).toBe(`Artist: ${song.kuenstler}`);
        }
      }),
      PBT_CONFIG,
    );
  });

  /**
   * Sub-property 5c: If artist is null or empty, no "Artist:" line exists
   *
   * **Validates: Requirements 7.2**
   */
  it("if artist is null or empty, no 'Artist:' line exists", () => {
    fc.assert(
      fc.property(arbSongExportData(), (song) => {
        const lines = outputLines(song, ALL_ON);
        if (song.kuenstler == null || song.kuenstler.trim() === "") {
          const artistLines = lines.filter((l) => l.startsWith("Artist:"));
          expect(artistLines.length).toBe(0);
        }
      }),
      PBT_CONFIG,
    );
  });

  /**
   * Sub-property 5d: Each strophe has a section tag line in square brackets
   *
   * **Validates: Requirements 7.3**
   */
  it("each strophe produces a section tag in square brackets", () => {
    fc.assert(
      fc.property(arbSongExportData(), (song) => {
        const lines = outputLines(song, ALL_ON);

        // Build expected section tags in orderIndex order
        const sortedStrophen = [...song.strophen].sort(
          (a, b) => a.orderIndex - b.orderIndex,
        );
        const expectedTags = sortedStrophen.map((s) =>
          s.istInstrumental ? "[Instrumental]" : `[${s.name}]`,
        );

        // Each expected tag must appear in the output
        for (const tag of expectedTags) {
          expect(lines).toContain(tag);
        }
      }),
      PBT_CONFIG,
    );
  });

  /**
   * Sub-property 5e: Instrumental strophen use "[Instrumental]" as section tag
   *
   * **Validates: Requirements 7.5**
   */
  it("instrumental strophen use '[Instrumental]' as section tag", () => {
    fc.assert(
      fc.property(arbSongExportData(), (song) => {
        const lines = outputLines(song, ALL_ON);
        const instrumentalCount = song.strophen.filter(
          (s) => s.istInstrumental,
        ).length;
        const instrumentalTags = lines.filter(
          (l) => l === "[Instrumental]",
        );
        expect(instrumentalTags.length).toBe(instrumentalCount);
      }),
      PBT_CONFIG,
    );
  });

  /**
   * Sub-property 5f: Comment zeilen produce lines starting with "# "
   *
   * **Validates: Requirements 7.6**
   */
  it("comment zeilen produce lines starting with '# '", () => {
    fc.assert(
      fc.property(arbSongExportData(), (song) => {
        const lines = outputLines(song, ALL_ON);

        // Count comment zeilen in input
        let commentZeilenCount = 0;
        for (const strophe of song.strophen) {
          for (const zeile of strophe.zeilen) {
            if (zeile.istKommentar) {
              commentZeilenCount++;
            }
          }
        }

        // Each comment zeile should produce a line starting with "# "
        // (vocal tags and translations also produce "# " lines, so we check >=)
        const hashLines = lines.filter((l) => l.startsWith("# "));
        expect(hashLines.length).toBeGreaterThanOrEqual(commentZeilenCount);
      }),
      PBT_CONFIG,
    );
  });

  /**
   * Sub-property 5g: Vocal-tag markups produce lines starting with "# "
   *
   * The number of "# " lines should be at least the sum of vocal-tag markups
   * + comment zeilen + translation lines.
   *
   * **Validates: Requirements 7.4**
   */
  it("vocal-tag markups produce lines starting with '# '", () => {
    fc.assert(
      fc.property(arbSongExportData(), (song) => {
        const lines = outputLines(song, ALL_ON);

        // Count vocal-tag markups in input (strophe-level + zeile-level)
        let vocalTagCount = 0;
        for (const strophe of song.strophen) {
          for (const markup of strophe.markups) {
            if (VOCAL_TAG_SET.has(markup.typ)) {
              vocalTagCount++;
            }
          }
          for (const zeile of strophe.zeilen) {
            for (const markup of zeile.markups) {
              if (VOCAL_TAG_SET.has(markup.typ)) {
                vocalTagCount++;
              }
            }
          }
        }

        // Count comment zeilen and translation lines too (they also start with "# ")
        let commentZeilenCount = 0;
        let translationCount = 0;
        for (const strophe of song.strophen) {
          for (const zeile of strophe.zeilen) {
            if (zeile.istKommentar) commentZeilenCount++;
            if (zeile.uebersetzung != null && zeile.uebersetzung !== "") {
              translationCount++;
            }
          }
        }

        const hashLines = lines.filter((l) => l.startsWith("# "));
        // "# " lines >= vocal tags + comment zeilen + translations
        expect(hashLines.length).toBeGreaterThanOrEqual(
          vocalTagCount + commentZeilenCount + translationCount,
        );
      }),
      PBT_CONFIG,
    );
  });

  /**
   * Sub-property 5h: Zeilen with translations produce a line containing "↳"
   *
   * **Validates: Requirements 11.1**
   */
  it("zeilen with translations produce a line containing '↳'", () => {
    fc.assert(
      fc.property(arbSongExportData(), (song) => {
        const lines = outputLines(song, ALL_ON);

        // Count zeilen with non-null, non-empty uebersetzung
        let translationCount = 0;
        for (const strophe of song.strophen) {
          for (const zeile of strophe.zeilen) {
            if (zeile.uebersetzung != null && zeile.uebersetzung !== "") {
              translationCount++;
            }
          }
        }

        const translationLines = lines.filter((l) => l.includes("↳"));
        expect(translationLines.length).toBe(translationCount);
      }),
      PBT_CONFIG,
    );
  });
});
