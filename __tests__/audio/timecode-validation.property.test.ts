/**
 * Property 5: Ungültige Timecodes werden abgelehnt
 *
 * Für jeden String, der nicht einem gültigen Timecode-Format entspricht:
 * `parseTimecode` gibt `null` zurück, `isValidTimecode` gibt `false` zurück.
 *
 * Gültige Formate: [mm:ss], mm:ss, m:ss, ss (nur Sekunden), mit mm ∈ [0,99] und ss ∈ [0,59]
 *
 * **Validates: Requirements 3.3**
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { parseTimecode, isValidTimecode } from "@/lib/audio/timecode";

// Generator: wrong bracket styles (not square brackets)
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

// Generator: ss >= 60 (invalid seconds) in bracket format
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

// Generator: strings with letters mixed in
const lettersInTimecode = fc
  .tuple(fc.string({ minLength: 1, maxLength: 5 }), fc.integer({ min: 0, max: 59 }))
  .filter(([s]) => /[a-zA-Z]/.test(s))
  .map(([s, ss]) => `${s}:${String(ss).padStart(2, "0")}`);

/**
 * Checks if a string is a valid timecode under the flexible parser rules.
 */
function isActuallyValid(s: string): boolean {
  const trimmed = s.trim();
  // mm:ss with optional brackets, 1-2 digit mm and ss
  const flexMatch = trimmed.match(/^\[?(\d{1,2}):(\d{1,2})\]?$/);
  if (flexMatch) {
    const mm = parseInt(flexMatch[1], 10);
    const ss = parseInt(flexMatch[2], 10);
    return mm >= 0 && mm <= 99 && ss >= 0 && ss <= 59;
  }
  // seconds-only
  const secMatch = trimmed.match(/^\[?(\d{1,3})\]?$/);
  if (secMatch) {
    const total = parseInt(secMatch[1], 10);
    return total >= 0 && total <= 5999;
  }
  return false;
}

describe("Property 5: Ungültige Timecodes werden abgelehnt", () => {
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

  it("rejects strings with wrong bracket styles", () => {
    fc.assert(
      fc.property(wrongBrackets, (input) => {
        expect(parseTimecode(input)).toBeNull();
        expect(isValidTimecode(input)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it("rejects empty string", () => {
    expect(parseTimecode("")).toBeNull();
    expect(isValidTimecode("")).toBe(false);
  });

  it("accepts flexible formats without brackets", () => {
    // mm:ss without brackets should now be valid
    expect(parseTimecode("01:30")).toBe(90000);
    expect(parseTimecode("1:01")).toBe(61000);
    expect(isValidTimecode("01:30")).toBe(true);
    expect(isValidTimecode("1:01")).toBe(true);
  });

  it("accepts seconds-only input", () => {
    expect(parseTimecode("17")).toBe(17000);
    expect(parseTimecode("0")).toBe(0);
    expect(parseTimecode("90")).toBe(90000); // 1:30
    expect(isValidTimecode("17")).toBe(true);
  });

  it("accepts single-digit formats with brackets", () => {
    expect(parseTimecode("[1:5]")).toBe(65000); // 1 min 5 sec
    expect(parseTimecode("[0:9]")).toBe(9000);
    expect(isValidTimecode("[1:5]")).toBe(true);
  });
});
