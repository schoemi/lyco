/**
 * Property 2: Deterministische Lücken-Generierung
 *
 * Für jede Zeile und jede Schwierigkeitsstufe soll der Gap-Generator bei zweimaligem
 * Aufruf mit identischen Eingaben (gleiche Zeilen-ID, gleicher Text, gleiche
 * Schwierigkeitsstufe) exakt die gleichen Lücken erzeugen.
 *
 * **Validates: Requirements 2.5**
 */
// Feature: cloze-learning, Property 2: Deterministische Lücken-Generierung

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { generateGaps } from "@/lib/cloze/gap-generator";
import type { DifficultyLevel } from "@/types/cloze";

const DIFFICULTY_LEVELS: DifficultyLevel[] = ["leicht", "mittel", "schwer", "blind"];

const arbWord = fc.stringMatching(/^[a-zA-Z]{1,12}$/);

const arbLine = fc
  .array(arbWord, { minLength: 1, maxLength: 20 })
  .map((words) => words.join(" "));

const arbDifficulty = fc.constantFrom<DifficultyLevel>(...DIFFICULTY_LEVELS);

describe("Property 2: Deterministische Lücken-Generierung", () => {
  it("two calls with identical inputs produce identical gaps", () => {
    fc.assert(
      fc.property(
        arbLine,
        arbDifficulty,
        fc.uuid(),
        (lineText, difficulty, zeileId) => {
          const zeilen = [{ id: zeileId, text: lineText }];

          const firstResult = generateGaps(zeilen, difficulty);
          const secondResult = generateGaps(zeilen, difficulty);

          expect(firstResult).toStrictEqual(secondResult);
        },
      ),
      { numRuns: 100 },
    );
  });
});
