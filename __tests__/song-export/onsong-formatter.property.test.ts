/**
 * Feature: song-export
 * Property 4: OnSong Formatter Structure
 *
 * Für beliebige SongExportData prüft dieser Test die strukturellen
 * Invarianten der OnSong-Ausgabe:
 * - Titel als erste Zeile
 * - Künstler als zweite Zeile (oder leer)
 * - Leerzeile als Separator
 * - Sektions-Header für jede Strophe (endet mit ":")
 * - Instrumental-Header "Instrumental:"
 * - Kommentar-Zeilen mit ";"
 * - Vocal-Tag-Zeilen mit ";"
 * - Übersetzungs-Zeilen mit "↳"
 *
 * **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 11.1**
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { formatOnSong } from "@/lib/export/formatters/onsong-formatter";
import { VOCAL_TAG_TYPES } from "@/lib/export/export-types";
import type { ExportOptions, SongExportData } from "@/lib/export/export-types";
import {
  arbSongExportData,
  arbExportOptions,
} from "./format-filter.property.test";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** ALL_ON options ensure nothing is filtered out */
const ALL_ON: ExportOptions = {
  vocalTags: true,
  instrumental: true,
  kommentare: true, uebersetzungen: true,
};

const PBT_CONFIG = { numRuns: 100 };

const VOCAL_TAG_SET = new Set<string>(VOCAL_TAG_TYPES);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse the OnSong output into lines */
function outputLines(song: SongExportData, options: ExportOptions): string[] {
  const result = formatOnSong(song, options);
  return result.data.toString("utf-8").split("\n");
}

// ---------------------------------------------------------------------------
// Property 4: OnSong Formatter Structure
// ---------------------------------------------------------------------------

describe("Property 4: OnSong Formatter Structure", () => {
  /**
   * Sub-property 4a: First line is always the song title
   *
   * **Validates: Requirements 6.1, 6.2**
   */
  it("first line is the song title", () => {
    fc.assert(
      fc.property(arbSongExportData(), (song) => {
        const lines = outputLines(song, ALL_ON);
        expect(lines[0]).toBe(song.titel);
      }),
      PBT_CONFIG,
    );
  });

  /**
   * Sub-property 4b: Second line is the artist (or empty if null)
   *
   * **Validates: Requirements 6.2**
   */
  it("second line is the artist or empty if null", () => {
    fc.assert(
      fc.property(arbSongExportData(), (song) => {
        const lines = outputLines(song, ALL_ON);
        expect(lines[1]).toBe(song.kuenstler ?? "");
      }),
      PBT_CONFIG,
    );
  });

  /**
   * Sub-property 4c: Third line is an empty separator
   *
   * **Validates: Requirements 6.2**
   */
  it("third line is an empty separator", () => {
    fc.assert(
      fc.property(arbSongExportData(), (song) => {
        const lines = outputLines(song, ALL_ON);
        expect(lines[2]).toBe("");
      }),
      PBT_CONFIG,
    );
  });

  /**
   * Sub-property 4d: Each strophe has a section header ending with ":"
   *
   * We verify that for each strophe, its expected header appears in the
   * body of the output (lines after the 3-line header: title, artist, blank).
   *
   * **Validates: Requirements 6.3**
   */
  it("each strophe produces a section header ending with ':'", () => {
    fc.assert(
      fc.property(arbSongExportData(), (song) => {
        const lines = outputLines(song, ALL_ON);
        // Body starts after line 0 (title), line 1 (artist), line 2 (blank)
        const bodyLines = lines.slice(3);

        // Build expected headers in orderIndex order
        const sortedStrophen = [...song.strophen].sort(
          (a, b) => a.orderIndex - b.orderIndex,
        );
        const expectedHeaders = sortedStrophen.map((s) =>
          s.istInstrumental ? "Instrumental:" : `${s.name}:`,
        );

        // Each expected header must appear in the body
        for (const header of expectedHeaders) {
          expect(bodyLines).toContain(header);
        }

        // Count: number of body lines that match an expected header
        // should be exactly the number of strophen
        // (headers are unique per strophe position, but names could collide,
        //  so we just verify each expected header is present)
      }),
      PBT_CONFIG,
    );
  });

  /**
   * Sub-property 4e: Instrumental strophen use "Instrumental:" as header
   *
   * **Validates: Requirements 6.5**
   */
  it("instrumental strophen use 'Instrumental:' as header", () => {
    fc.assert(
      fc.property(arbSongExportData(), (song) => {
        const lines = outputLines(song, ALL_ON);
        const instrumentalCount = song.strophen.filter(
          (s) => s.istInstrumental,
        ).length;
        const instrumentalHeaders = lines.filter(
          (l) => l === "Instrumental:",
        );
        expect(instrumentalHeaders.length).toBe(instrumentalCount);
      }),
      PBT_CONFIG,
    );
  });

  /**
   * Sub-property 4f: Comment zeilen produce lines starting with ";"
   *
   * **Validates: Requirements 6.6**
   */
  it("comment zeilen produce lines starting with ';'", () => {
    fc.assert(
      fc.property(arbSongExportData(), (song) => {
        const lines = outputLines(song, ALL_ON);
        // Body starts after the 3-line header
        const bodyLines = lines.slice(3);

        // Count comment zeilen in input
        let commentZeilenCount = 0;
        for (const strophe of song.strophen) {
          for (const zeile of strophe.zeilen) {
            if (zeile.istKommentar) {
              commentZeilenCount++;
            }
          }
        }

        // Each comment zeile should produce a line starting with ";"
        // (vocal tags and translations also produce ";" lines, so we check >=)
        const semicolonLines = bodyLines.filter((l) => l.startsWith(";"));
        expect(semicolonLines.length).toBeGreaterThanOrEqual(commentZeilenCount);
      }),
      PBT_CONFIG,
    );
  });

  /**
   * Sub-property 4g: Vocal-tag markups produce lines starting with ";"
   *
   * In the body (after the 3-line header), the number of ";" lines is at
   * least the sum of vocal-tag markups + comment zeilen + translation lines.
   * (Regular zeile text that happens to start with ";" may add more.)
   *
   * **Validates: Requirements 6.4**
   */
  it("vocal-tag markups produce lines starting with ';'", () => {
    fc.assert(
      fc.property(arbSongExportData(), (song) => {
        const lines = outputLines(song, ALL_ON);
        // Body starts after the 3-line header (title, artist, blank)
        const bodyLines = lines.slice(3);

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

        // Count comment zeilen and translation lines too (they also start with ";")
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

        const semicolonLines = bodyLines.filter((l) => l.startsWith(";"));
        // ";" lines in body >= vocal tags + comment zeilen
        // (regular text starting with ";" may add more)
        // Translations are no longer exported in OnSong format
        expect(semicolonLines.length).toBeGreaterThanOrEqual(
          vocalTagCount + commentZeilenCount,
        );
      }),
      PBT_CONFIG,
    );
  });

  /**
   * Sub-property 4h: Translations are not exported in OnSong format
   *
   * **Validates: Requirements 11.1**
   */
  it("translations are not included in OnSong output", () => {
    fc.assert(
      fc.property(arbSongExportData(), (song) => {
        const lines = outputLines(song, ALL_ON);

        const translationLines = lines.filter((l) => l.includes("↳"));
        expect(translationLines.length).toBe(0);
      }),
      PBT_CONFIG,
    );
  });
});
