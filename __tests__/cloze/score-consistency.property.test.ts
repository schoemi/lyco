/**
 * Property 6: Score und Fortschritt sind konsistent
 *
 * Für jede Sequenz von Antwort-Validierungen soll gelten:
 * `calculateProgress(correct, total)` === `Math.round(correct / total * 100)`.
 * Sonderfall: `calculateProgress(0, 0)` === 0.
 *
 * **Validates: Requirements 5.1, 5.2**
 */
// Feature: cloze-learning, Property 6: Score und Fortschritt sind konsistent

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { calculateProgress } from "@/lib/cloze/score";

describe("Property 6: Score und Fortschritt sind konsistent", () => {
  it("calculateProgress(correct, total) === Math.round(correct / total * 100) for arbitrary valid inputs", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),
        (total) => {
          const correct = fc.sample(fc.integer({ min: 0, max: total }), 1)[0];
          const result = calculateProgress(correct, total);
          const expected = Math.round((correct / total) * 100);
          expect(result).toBe(expected);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("calculateProgress(correct, total) matches reference for all correct in 0..total", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }).chain((total) =>
          fc.tuple(fc.integer({ min: 0, max: total }), fc.constant(total)),
        ),
        ([correct, total]) => {
          const result = calculateProgress(correct, total);
          const expected = Math.round((correct / total) * 100);
          expect(result).toBe(expected);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("calculateProgress(0, 0) === 0 (edge case: division by zero)", () => {
    expect(calculateProgress(0, 0)).toBe(0);
  });

  it("result is always in range [0, 100]", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }).chain((total) =>
          fc.tuple(fc.integer({ min: 0, max: total }), fc.constant(total)),
        ),
        ([correct, total]) => {
          const result = calculateProgress(correct, total);
          expect(result).toBeGreaterThanOrEqual(0);
          expect(result).toBeLessThanOrEqual(100);
        },
      ),
      { numRuns: 100 },
    );
  });
});
