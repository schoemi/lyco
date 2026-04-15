/**
 * Property 4: filterLernbareZeilen Idempotenz
 *
 * For any array of ZeileDetail objects where no zeile has
 * istKommentar === true, filterLernbareZeilen SHALL return an array
 * identical to the input (same elements, same order).
 *
 * **Validates: Requirements 11.6**
 */
// Feature: instrumental-annotations, Property 4: filterLernbareZeilen Idempotenz

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { filterLernbareZeilen } from "@/lib/shared/strophen-selection";
import {
  arbNonKommentarZeileArray,
  arbZeileDetailArray,
} from "./generators";

describe("Property 4: filterLernbareZeilen Idempotenz", () => {
  it("returns identical array when no zeile is a kommentar", () => {
    fc.assert(
      fc.property(arbNonKommentarZeileArray, (zeilen) => {
        const result = filterLernbareZeilen(zeilen);
        expect(result).toEqual(zeilen);
      }),
      { numRuns: 100 },
    );
  });

  it("applying filter twice yields the same result as applying it once", () => {
    fc.assert(
      fc.property(arbZeileDetailArray, (zeilen) => {
        const once = filterLernbareZeilen(zeilen);
        const twice = filterLernbareZeilen(once);
        expect(twice).toEqual(once);
      }),
      { numRuns: 100 },
    );
  });
});
