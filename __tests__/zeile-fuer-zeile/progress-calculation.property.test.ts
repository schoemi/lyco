/**
 * Property 7: Fortschrittsberechnung ist proportional
 *
 * Für jede Strophe mit N Zeilen (N > 0) und jede Anzahl abgeschlossener
 * Zeilen C (0 ≤ C ≤ N), soll `calculateStropheProgress(C, N)` den Wert
 * `Math.round((C / N) * 100)` zurückgeben.
 *
 * **Validates: Requirements 7.1, 7.2**
 */
// Feature: line-by-line-learning, Property 7: Fortschrittsberechnung ist proportional

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { calculateStropheProgress } from "@/lib/zeile-fuer-zeile/progress";

describe("Property 7: Fortschrittsberechnung ist proportional", () => {
  it("returns 0 when totalZeilen === 0", () => {
    fc.assert(
      fc.property(fc.nat({ max: 1000 }), (completed) => {
        expect(calculateStropheProgress(completed, 0)).toBe(0);
      }),
      { numRuns: 100 },
    );
  });

  it("returns 100 when completedZeilen === totalZeilen (N > 0)", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1000 }), (n) => {
        expect(calculateStropheProgress(n, n)).toBe(100);
      }),
      { numRuns: 100 },
    );
  });

  it("equals Math.round((C / N) * 100) for any valid C and N (0 ≤ C ≤ N, N > 0)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }).chain((n) =>
          fc.tuple(fc.integer({ min: 0, max: n }), fc.constant(n)),
        ),
        ([completed, total]) => {
          const expected = Math.round((completed / total) * 100);
          expect(calculateStropheProgress(completed, total)).toBe(expected);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("result is always between 0 and 100 for valid inputs", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }).chain((n) =>
          fc.tuple(fc.integer({ min: 0, max: n }), fc.constant(n)),
        ),
        ([completed, total]) => {
          const result = calculateStropheProgress(completed, total);
          expect(result).toBeGreaterThanOrEqual(0);
          expect(result).toBeLessThanOrEqual(100);
        },
      ),
      { numRuns: 100 },
    );
  });
});
