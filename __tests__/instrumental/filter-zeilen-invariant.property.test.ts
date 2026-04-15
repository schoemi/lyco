/**
 * Property 3: filterLernbareZeilen Subset-Invariante
 *
 * For any array of ZeileDetail objects, filterLernbareZeilen SHALL return
 * a subset of the input that contains no zeile with istKommentar === true,
 * and every non-kommentar zeile from the input SHALL be present in the output.
 *
 * **Validates: Requirements 11.2, 11.4**
 */
// Feature: instrumental-annotations, Property 3: filterLernbareZeilen Subset-Invariante

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { filterLernbareZeilen } from "@/lib/shared/strophen-selection";
import { arbZeileDetailArray } from "./generators";

describe("Property 3: filterLernbareZeilen Subset-Invariante", () => {
  it("output contains no zeile with istKommentar === true", () => {
    fc.assert(
      fc.property(arbZeileDetailArray, (zeilen) => {
        const result = filterLernbareZeilen(zeilen);
        for (const z of result) {
          expect(z.istKommentar).toBe(false);
        }
      }),
      { numRuns: 100 },
    );
  });

  it("output is a subset of the input (every result element exists in input)", () => {
    fc.assert(
      fc.property(arbZeileDetailArray, (zeilen) => {
        const result = filterLernbareZeilen(zeilen);
        const inputIds = new Set(zeilen.map((z) => z.id));
        for (const z of result) {
          expect(inputIds.has(z.id)).toBe(true);
        }
      }),
      { numRuns: 100 },
    );
  });

  it("every non-kommentar zeile from input is present in output", () => {
    fc.assert(
      fc.property(arbZeileDetailArray, (zeilen) => {
        const result = filterLernbareZeilen(zeilen);
        const resultIds = new Set(result.map((z) => z.id));
        const nonKommentar = zeilen.filter((z) => !z.istKommentar);
        for (const z of nonKommentar) {
          expect(resultIds.has(z.id)).toBe(true);
        }
      }),
      { numRuns: 100 },
    );
  });

  it("output length equals the count of non-kommentar zeilen in input", () => {
    fc.assert(
      fc.property(arbZeileDetailArray, (zeilen) => {
        const result = filterLernbareZeilen(zeilen);
        const expectedCount = zeilen.filter((z) => !z.istKommentar).length;
        expect(result.length).toBe(expectedCount);
      }),
      { numRuns: 100 },
    );
  });
});
