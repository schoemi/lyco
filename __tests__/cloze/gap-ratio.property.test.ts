/**
 * Property 1: Lücken-Anteil entspricht Schwierigkeitsstufe
 *
 * Für jede Zeile mit mindestens 2 Wörtern und jede Schwierigkeitsstufe soll der Anteil
 * der als Lücken markierten Wörter dem konfigurierten Prozentsatz entsprechen (±1 Wort
 * Toleranz durch Rundung). Bei „Blind" müssen exakt 100% der Wörter Lücken sein.
 *
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4**
 */
// Feature: cloze-learning, Property 1: Lücken-Anteil entspricht Schwierigkeitsstufe

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { generateGaps, DIFFICULTY_CONFIG } from "@/lib/cloze/gap-generator";
import type { DifficultyLevel } from "@/types/cloze";

const DIFFICULTY_LEVELS: DifficultyLevel[] = ["leicht", "mittel", "schwer", "blind"];

// Generator: a line with ≥ 2 words (each word is 1–12 alpha chars)
const arbWord = fc.stringMatching(/^[a-zA-Z]{1,12}$/);

const arbLineWith2PlusWords = fc
  .array(arbWord, { minLength: 2, maxLength: 20 })
  .map((words) => words.join(" "));

const arbDifficulty = fc.constantFrom<DifficultyLevel>(...DIFFICULTY_LEVELS);

describe("Property 1: Lücken-Anteil entspricht Schwierigkeitsstufe", () => {
  it("gap ratio matches configured percentage (±1 word tolerance), blind = 100%", () => {
    fc.assert(
      fc.property(
        arbLineWith2PlusWords,
        arbDifficulty,
        fc.uuid(),
        (lineText, difficulty, zeileId) => {
          const zeilen = [{ id: zeileId, text: lineText }];
          const gaps = generateGaps(zeilen, difficulty);

          const totalWords = gaps.length;
          const gapCount = gaps.filter((g) => g.isGap).length;
          const config = DIFFICULTY_CONFIG[difficulty];

          if (difficulty === "blind") {
            // Blind: exactly 100% gaps
            expect(gapCount).toBe(totalWords);
          } else {
            // Expected gap count with ±1 tolerance for rounding
            const expectedGaps = Math.round(totalWords * config.ratio);
            expect(Math.abs(gapCount - expectedGaps)).toBeLessThanOrEqual(1);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
