/**
 * Property 1: filterLernbareStrophen Subset-Invariante
 *
 * For any array of StropheDetail objects, filterLernbareStrophen SHALL return
 * a subset of the input that contains no strophe with istInstrumental === true,
 * and every non-instrumental strophe from the input SHALL be present in the output.
 *
 * **Validates: Requirements 11.1, 11.3**
 */
// Feature: instrumental-annotations, Property 1: filterLernbareStrophen Subset-Invariante

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { filterLernbareStrophen } from "@/lib/shared/strophen-selection";
import { arbStropheDetailArray } from "./generators";

describe("Property 1: filterLernbareStrophen Subset-Invariante", () => {
  it("output contains no strophe with istInstrumental === true", () => {
    fc.assert(
      fc.property(arbStropheDetailArray, (strophen) => {
        const result = filterLernbareStrophen(strophen);
        for (const s of result) {
          expect(s.istInstrumental).toBe(false);
        }
      }),
      { numRuns: 100 },
    );
  });

  it("output is a subset of the input (every result element exists in input)", () => {
    fc.assert(
      fc.property(arbStropheDetailArray, (strophen) => {
        const result = filterLernbareStrophen(strophen);
        const inputIds = new Set(strophen.map((s) => s.id));
        for (const s of result) {
          expect(inputIds.has(s.id)).toBe(true);
        }
      }),
      { numRuns: 100 },
    );
  });

  it("every non-instrumental strophe from input is present in output", () => {
    fc.assert(
      fc.property(arbStropheDetailArray, (strophen) => {
        const result = filterLernbareStrophen(strophen);
        const resultIds = new Set(result.map((s) => s.id));
        const nonInstrumental = strophen.filter((s) => !s.istInstrumental);
        for (const s of nonInstrumental) {
          expect(resultIds.has(s.id)).toBe(true);
        }
      }),
      { numRuns: 100 },
    );
  });

  it("output length equals the count of non-instrumental strophes in input", () => {
    fc.assert(
      fc.property(arbStropheDetailArray, (strophen) => {
        const result = filterLernbareStrophen(strophen);
        const expectedCount = strophen.filter((s) => !s.istInstrumental).length;
        expect(result.length).toBe(expectedCount);
      }),
      { numRuns: 100 },
    );
  });
});
