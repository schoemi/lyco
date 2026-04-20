/**
 * Feature: song-export
 * Property 7: Strophe Count Monotonicity
 *
 * Für beliebige SongExportData mit N Strophen und beliebige ExportOptions:
 * Anzahl Strophen nach Filterung ≤ N.
 * Filterung kann nur Strophen reduzieren, niemals hinzufügen.
 *
 * **Validates: Requirements 10.3**
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { applyExportOptions } from "@/lib/export/format-filter";
import { arbSongExportData, arbExportOptions } from "./format-filter.property.test";

// ---------------------------------------------------------------------------
// PBT Config
// ---------------------------------------------------------------------------

const PBT_CONFIG = { numRuns: 100 };

// ---------------------------------------------------------------------------
// Property 7: Strophe Count Monotonicity
// ---------------------------------------------------------------------------

describe("Property 7: Strophe Count Monotonicity", () => {
  /**
   * For any SongExportData with N strophen and any ExportOptions,
   * the number of strophen after filtering must be ≤ N.
   *
   * **Validates: Requirements 10.3**
   */
  it("filtered strophe count is always ≤ input strophe count", () => {
    fc.assert(
      fc.property(arbSongExportData(), arbExportOptions(), (song, options) => {
        const inputCount = song.strophen.length;
        const result = applyExportOptions(song, options);
        const outputCount = result.strophen.length;

        expect(outputCount).toBeLessThanOrEqual(inputCount);
      }),
      PBT_CONFIG,
    );
  });
});
