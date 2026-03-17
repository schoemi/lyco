/**
 * Property: Normalization idempotency and correctness
 *
 * - `normalizeText(normalizeText(x)) === normalizeText(x)` for any string
 * - `validateDiktat(target, target).correct === true` for any string
 *
 * **Validates: Requirements 5.7**
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { normalizeText } from "@/lib/quiz/normalize";
import { validateDiktat } from "@/lib/quiz/validate-answer";

describe("Property: Normalization idempotency and correctness", () => {
  it("normalizeText is idempotent: normalizeText(normalizeText(x)) === normalizeText(x)", () => {
    fc.assert(
      fc.property(fc.string(), (text) => {
        const once = normalizeText(text);
        const twice = normalizeText(once);
        expect(twice).toBe(once);
      }),
      { numRuns: 200 },
    );
  });

  it("validateDiktat marks identical input as correct: validateDiktat(target, target).correct === true", () => {
    fc.assert(
      fc.property(fc.string(), (text) => {
        const result = validateDiktat(text, text);
        expect(result.correct).toBe(true);
      }),
      { numRuns: 200 },
    );
  });
});
