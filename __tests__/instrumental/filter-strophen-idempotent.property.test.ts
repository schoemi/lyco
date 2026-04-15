/**
 * Property 2: filterLernbareStrophen Idempotenz
 *
 * For any array of StropheDetail objects where no strophe has
 * istInstrumental === true, filterLernbareStrophen SHALL return an array
 * identical to the input (same elements, same order).
 *
 * **Validates: Requirements 11.5**
 */
// Feature: instrumental-annotations, Property 2: filterLernbareStrophen Idempotenz

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { filterLernbareStrophen } from "@/lib/shared/strophen-selection";
import {
  arbNonInstrumentalStropheArray,
  arbStropheDetailArray,
} from "./generators";

describe("Property 2: filterLernbareStrophen Idempotenz", () => {
  it("returns identical array when no strophe is instrumental", () => {
    fc.assert(
      fc.property(arbNonInstrumentalStropheArray, (strophen) => {
        const result = filterLernbareStrophen(strophen);
        expect(result).toEqual(strophen);
      }),
      { numRuns: 100 },
    );
  });

  it("applying filter twice yields the same result as applying it once", () => {
    fc.assert(
      fc.property(arbStropheDetailArray, (strophen) => {
        const once = filterLernbareStrophen(strophen);
        const twice = filterLernbareStrophen(once);
        expect(twice).toEqual(once);
      }),
      { numRuns: 100 },
    );
  });
});
