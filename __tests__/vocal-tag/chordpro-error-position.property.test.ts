/**
 * Property 4: Ungültige Syntax liefert Fehler mit Positionsangabe
 *
 * For any text containing unclosed curly braces (a `{` without a matching `}`),
 * the parser shall return at least one error object whose `position` field
 * points to the location of the unclosed brace.
 *
 * **Validates: Requirements 4.6**
 */
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { parseChordPro } from "@/lib/vocal-tag/chordpro-parser";

const PBT_CONFIG = { numRuns: 100 };

// --- Generators ---

/** Plain text segment without `{` or `}` */
const plainSegmentArb = fc.stringMatching(/^[a-zA-ZäöüÄÖÜß0-9 ,.\-!?]{1,30}$/);

/** A valid ChordPro tag: `{tag: zusatztext}` or `{tag:}` */
const validTagArb = fc
  .tuple(
    fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9]{0,11}$/),
    fc.oneof(
      fc.stringMatching(/^[a-zA-ZäöüÄÖÜß0-9 ]{1,20}$/),
      fc.constant("")
    )
  )
  .map(([tag, zusatz]) =>
    zusatz ? `{${tag}: ${zusatz}}` : `{${tag}:}`
  );

/** A segment that is either plain text or a valid tag */
const segmentArb = fc.oneof(plainSegmentArb, validTagArb);

/**
 * Generate a text that contains at least one unclosed `{`.
 *
 * Strategy: build an array of normal segments, then inject an unclosed `{`
 * (followed by some non-`}` text) at a random position. We track the
 * expected position of the unclosed brace so we can verify the parser
 * reports it correctly.
 */
const textWithUnclosedBraceArb = fc
  .tuple(
    fc.array(segmentArb, { minLength: 0, maxLength: 4 }),
    fc.array(segmentArb, { minLength: 0, maxLength: 4 }),
    // Content after the unclosed `{` — no `}` allowed so it stays unclosed
    fc.stringMatching(/^[a-zA-Z0-9 ]{0,15}$/)
  )
  .map(([before, after, trailing]) => {
    const prefix = before.join("");
    const suffix = after.join("");
    const unclosedBrace = `{${trailing}`;
    const text = prefix + unclosedBrace + suffix;
    const unclosedPosition = prefix.length;
    return { text, unclosedPosition };
  });

describe("Property 4: Ungültige Syntax liefert Fehler mit Positionsangabe", () => {
  /**
   * **Validates: Requirements 4.6**
   *
   * For any text with at least one unclosed `{`:
   * the parser returns at least one error with a `position` field
   * pointing to the location of the unclosed brace.
   */
  it("unclosed `{` produces at least one error with position info", () => {
    return fc.assert(
      fc.property(textWithUnclosedBraceArb, ({ text, unclosedPosition }) => {
        const result = parseChordPro(text, []);

        // Must have at least one error
        expect(result.errors.length).toBeGreaterThanOrEqual(1);

        // At least one error must have a numeric `position` field
        const hasPositionField = result.errors.some(
          (err) => typeof err.position === "number"
        );
        expect(hasPositionField).toBe(true);

        // At least one error's position must point to our injected unclosed brace
        const pointsToUnclosed = result.errors.some(
          (err) => err.position === unclosedPosition
        );
        expect(pointsToUnclosed).toBe(true);
      }),
      PBT_CONFIG
    );
  });
});
