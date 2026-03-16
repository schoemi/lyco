/**
 * Bug-Condition Explorations-Test – Cloze UX Fixes
 *
 * Dieser Test wird VOR der Implementierung des Fixes geschrieben und soll auf
 * dem unfixierten Code FEHLSCHLAGEN. Das Fehlschlagen bestätigt, dass der Bug existiert.
 *
 * Bug A (Leertaste): GapInput hat keinen onKeyDown-Handler, der die Leertaste
 * abfängt und den Fokus zur nächsten Lücke verschiebt.
 *
 * Bug B (Satzzeichen): generateGaps speichert Wörter inklusive Satzzeichen als
 * `word`, ohne prefix/suffix-Felder für abgetrennte Satzzeichen.
 *
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4**
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import fs from "fs";
import path from "path";
import { generateGaps, type ZeileInput } from "@/lib/cloze/gap-generator";
import type { DifficultyLevel } from "@/types/cloze";

// ── Punctuation characters as defined in the design ──
const PUNCTUATION_CHARS = [",", ".", "!", "?", ";", ":", '"', "'", "(", ")", "–", "…"];

// ── Arbitraries ──

/** A pure word without any punctuation (letters, digits, umlauts) */
const arbPureWord = fc.stringMatching(/^[a-zA-ZäöüÄÖÜß]{2,12}$/);

/** One or more trailing punctuation characters */
const arbSuffix = fc
  .array(fc.constantFrom(...PUNCTUATION_CHARS), { minLength: 1, maxLength: 3 })
  .map((chars) => chars.join(""));

/** One or more leading punctuation characters */
const arbPrefix = fc
  .array(fc.constantFrom(...PUNCTUATION_CHARS), { minLength: 1, maxLength: 3 })
  .map((chars) => chars.join(""));

const arbDifficulty = fc.constantFrom<DifficultyLevel>("leicht", "mittel", "schwer", "blind");

// ── Bug B: Satzzeichen-Abtrennung ──

describe("Bug Condition B: Satzzeichen werden nicht vom Lückenwort abgetrennt", () => {
  it("generateGaps should strip trailing punctuation from word and set suffix", () => {
    fc.assert(
      fc.property(
        arbPureWord,
        arbSuffix,
        fc.uuid(),
        (pureWord, suffix, zeileId) => {
          const token = pureWord + suffix;
          const zeilen: ZeileInput[] = [{ id: zeileId, text: token }];

          // Use blind mode so the single word becomes a gap
          const result = generateGaps(zeilen, "blind");

          expect(result).toHaveLength(1);
          const gap = result[0];

          // Expected: word should be the pure word without punctuation
          expect(gap.word).toBe(pureWord);
          // Expected: suffix field should contain the trailing punctuation
          expect((gap as Record<string, unknown>).suffix).toBe(suffix);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("generateGaps should strip leading punctuation from word and set prefix", () => {
    fc.assert(
      fc.property(
        arbPureWord,
        arbPrefix,
        fc.uuid(),
        (pureWord, prefix, zeileId) => {
          const token = prefix + pureWord;
          const zeilen: ZeileInput[] = [{ id: zeileId, text: token }];

          const result = generateGaps(zeilen, "blind");

          expect(result).toHaveLength(1);
          const gap = result[0];

          // Expected: word should be the pure word without punctuation
          expect(gap.word).toBe(pureWord);
          // Expected: prefix field should contain the leading punctuation
          expect((gap as Record<string, unknown>).prefix).toBe(prefix);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("generateGaps should strip both leading and trailing punctuation", () => {
    fc.assert(
      fc.property(
        arbPureWord,
        arbPrefix,
        arbSuffix,
        fc.uuid(),
        (pureWord, prefix, suffix, zeileId) => {
          const token = prefix + pureWord + suffix;
          const zeilen: ZeileInput[] = [{ id: zeileId, text: token }];

          const result = generateGaps(zeilen, "blind");

          expect(result).toHaveLength(1);
          const gap = result[0];

          expect(gap.word).toBe(pureWord);
          expect((gap as Record<string, unknown>).prefix).toBe(prefix);
          expect((gap as Record<string, unknown>).suffix).toBe(suffix);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ── Bug A: Leertaste als Navigation ──

describe("Bug Condition A: Leertaste navigiert nicht zur nächsten Lücke", () => {
  const COMPONENT_PATH = path.resolve(
    process.cwd(),
    "src/components/cloze/gap-input.tsx",
  );
  const source = fs.readFileSync(COMPONENT_PATH, "utf-8");

  it("GapInput should have an onKeyDown handler that intercepts spacebar", () => {
    // The component must have an onKeyDown handler
    expect(source).toContain("onKeyDown");
  });

  it("GapInput should call preventDefault when spacebar is pressed", () => {
    // The component must call preventDefault for spacebar
    expect(source).toContain("preventDefault");
  });

  it("GapInput should focus the next gap input on spacebar press", () => {
    // The component must contain logic to find and focus the next gap input
    expect(source).toMatch(/gap-.*focus|querySelectorAll.*gap|nextElementSibling/);
  });
});
