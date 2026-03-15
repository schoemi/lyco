/**
 * Property 3: Case-insensitive Antwort-Validierung
 *
 * Für jedes Wortpaar (Eingabe, Zielwort) soll `validateAnswer` genau dann `true`
 * zurückgeben, wenn die beiden Strings nach Trimmen und Konvertierung in
 * Kleinbuchstaben identisch sind.
 *
 * **Validates: Requirements 4.3**
 */
// Feature: cloze-learning, Property 3: Case-insensitive Antwort-Validierung

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { validateAnswer } from "@/lib/cloze/validate-answer";

const arbWord = fc.stringMatching(/^[a-zA-Z]{1,20}$/);

describe("Property 3: Case-insensitive Antwort-Validierung", () => {
  it("validateAnswer(word, word) === true for any word", () => {
    fc.assert(
      fc.property(arbWord, (word) => {
        expect(validateAnswer(word, word)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it("validateAnswer(word.toUpperCase(), word.toLowerCase()) === true", () => {
    fc.assert(
      fc.property(arbWord, (word) => {
        expect(validateAnswer(word.toUpperCase(), word.toLowerCase())).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('validateAnswer("  " + word + "  ", word) === true (whitespace trimming)', () => {
    fc.assert(
      fc.property(arbWord, (word) => {
        expect(validateAnswer("  " + word + "  ", word)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it("matches reference implementation: trim().toLowerCase() equality", () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (input, target) => {
        const expected =
          input.trim().toLowerCase() === target.trim().toLowerCase();
        expect(validateAnswer(input, target)).toBe(expected);
      }),
      { numRuns: 100 },
    );
  });
});
