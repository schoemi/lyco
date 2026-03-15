/**
 * Property 8: Hinweis-Format
 *
 * Für jedes Wort mit mindestens 1 Zeichen:
 * Hint = ersterBuchstabe + '···'
 *
 * **Validates: Requirements 7.2**
 */
// Feature: cloze-learning, Property 8: Hinweis-Format

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { generateHint } from "@/lib/cloze/hint";

describe("Property 8: Hinweis-Format", () => {
  it("hint equals first character + '···' for any non-empty string", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        (word) => {
          const hint = generateHint(word);
          expect(hint).toBe(word[0] + "···");
        },
      ),
      { numRuns: 100 },
    );
  });

  it("hint always has length of firstChar + 3 ellipsis characters", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        (word) => {
          const hint = generateHint(word);
          // '···' is a single-char '·' repeated 3 times
          expect(hint.length).toBe(1 + 3);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("hint starts with the first character of the word", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        (word) => {
          const hint = generateHint(word);
          expect(hint[0]).toBe(word[0]);
        },
      ),
      { numRuns: 100 },
    );
  });
});
