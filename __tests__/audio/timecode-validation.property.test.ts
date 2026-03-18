/**
 * Property 5: Ungültige Timecodes werden abgelehnt
 *
 * Für jeden String, der nicht `[mm:ss]` mit mm ∈ [0,99] und ss ∈ [0,59] entspricht:
 * `parseTimecode` gibt `null` zurück, `isValidTimecode` gibt `false` zurück.
 *
 * **Validates: Requirements 3.3**
 */
// Feature: audio-playback-timecodes, Property 5: Ungültige Timecodes werden abgelehnt

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { parseTimecode, isValidTimecode } from "@/lib/audio/timecode";

// Generator: completely random strings (most won't match [mm:ss])
const randomString = fc.string({ minLength: 0, maxLength: 30 });

// Generator: strings without brackets
const noBrackets = fc
  .tuple(fc.integer({ min: 0, max: 99 }), fc.integer({ min: 0, max: 59 }))
  .map(
    ([mm, ss]) =>
      `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`,
  );

// Generator: wrong bracket styles
const wrongBrackets = fc
  .tuple(
    fc.integer({ min: 0, max: 99 }),
    fc.integer({ min: 0, max: 59 }),
    fc.constantFrom("(", "{", "<"),
    fc.constantFrom(")", "}", ">"),
  )
  .map(
    ([mm, ss, open, close]) =>
      `${open}${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}${close}`,
  );

// Generator: ss >= 60 (invalid seconds)
const invalidSeconds = fc
  .tuple(fc.integer({ min: 0, max: 99 }), fc.integer({ min: 60, max: 99 }))
  .map(
    ([mm, ss]) =>
      `[${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}]`,
  );

// Generator: mm >= 100 (too many digits for minutes)
const invalidMinutes = fc
  .integer({ min: 100, max: 999 })
  .map((mm) => `[${mm}:30]`);

// Generator: empty string
const emptyString = fc.constant("");

// Generator: single-digit mm or ss (wrong format, needs 2 digits)
const singleDigitFormat = fc
  .tuple(fc.integer({ min: 0, max: 9 }), fc.integer({ min: 0, max: 9 }))
  .map(([mm, ss]) => `[${mm}:${ss}]`);

// Combined generator for all invalid timecodes
const invalidTimecode = fc.oneof(
  randomString,
  noBrackets,
  wrongBrackets,
  invalidSeconds,
  invalidMinutes,
  emptyString,
  singleDigitFormat,
);

/**
 * Filter: ensures the generated string is truly invalid.
 * A valid timecode matches [mm:ss] with mm ∈ [0,99] and ss ∈ [0,59].
 */
function isActuallyValid(s: string): boolean {
  const match = s.match(/^\[(\d{2}):(\d{2})\]$/);
  if (!match) return false;
  const mm = parseInt(match[1], 10);
  const ss = parseInt(match[2], 10);
  return mm >= 0 && mm <= 99 && ss >= 0 && ss <= 59;
}

describe("Property 5: Ungültige Timecodes werden abgelehnt", () => {
  it("parseTimecode returns null for invalid timecodes", () => {
    fc.assert(
      fc.property(
        invalidTimecode.filter((s) => !isActuallyValid(s)),
        (input) => {
          expect(parseTimecode(input)).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });

  it("isValidTimecode returns false for invalid timecodes", () => {
    fc.assert(
      fc.property(
        invalidTimecode.filter((s) => !isActuallyValid(s)),
        (input) => {
          expect(isValidTimecode(input)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("rejects strings with ss >= 60", () => {
    fc.assert(
      fc.property(invalidSeconds, (input) => {
        expect(parseTimecode(input)).toBeNull();
        expect(isValidTimecode(input)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it("rejects strings with mm >= 100", () => {
    fc.assert(
      fc.property(invalidMinutes, (input) => {
        expect(parseTimecode(input)).toBeNull();
        expect(isValidTimecode(input)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it("rejects strings without square brackets", () => {
    fc.assert(
      fc.property(noBrackets, (input) => {
        expect(parseTimecode(input)).toBeNull();
        expect(isValidTimecode(input)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });
});
