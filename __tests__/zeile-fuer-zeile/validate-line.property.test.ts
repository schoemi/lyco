/**
 * Property 1: Zeilenvergleich ist case-insensitive und trim-tolerant
 *
 * Für jede Zeile und jede Eingabe, die sich vom Originaltext nur durch
 * Groß-/Kleinschreibung und/oder führende/abschließende Leerzeichen
 * unterscheidet, soll `validateLine` `true` zurückgeben.
 *
 * **Validates: Requirements 3.2, 3.3, 3.4**
 */
// Feature: line-by-line-learning, Property 1: Zeilenvergleich ist case-insensitive und trim-tolerant

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { validateLine } from "@/lib/zeile-fuer-zeile/validate-line";

const arbLine = fc.stringMatching(/^[a-zA-Z ]{1,40}$/);

describe("Property 1: Zeilenvergleich ist case-insensitive und trim-tolerant", () => {
  it("validateLine(line, line) === true for any line", () => {
    fc.assert(
      fc.property(arbLine, (line) => {
        expect(validateLine(line, line)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it("validateLine(line.toUpperCase(), line.toLowerCase()) === true", () => {
    fc.assert(
      fc.property(arbLine, (line) => {
        expect(validateLine(line.toUpperCase(), line.toLowerCase())).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('validateLine("  " + line + "  ", line) === true (whitespace trimming)', () => {
    fc.assert(
      fc.property(arbLine, (line) => {
        expect(validateLine("  " + line + "  ", line)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it("matches reference implementation: trim().toLowerCase() equality", () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (input, target) => {
        const expected =
          input.trim().toLowerCase() === target.trim().toLowerCase();
        expect(validateLine(input, target)).toBe(expected);
      }),
      { numRuns: 100 },
    );
  });
});
