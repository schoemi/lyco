/**
 * Property 6: State-Reset bei Auswahl-Bestätigung
 *
 * Für jeden beliebigen Cloze-State mit vorhandenen Antworten, Feedback und Hints soll
 * nach Bestätigung einer neuen Strophen-Auswahl gelten: alle Antworten sind leer, alle
 * Feedback-Zustände sind null, die Hints-Menge ist leer, und der Score steht auf
 * { correct: 0, total: M } wobei M die Anzahl der Lücken in den neu aktiven Strophen ist.
 *
 * **Validates: Requirements 3.4, 3.5**
 */
// Feature: selective-cloze-practice, Property 6: State-Reset bei Auswahl-Bestätigung

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { generateGaps } from "@/lib/cloze/gap-generator";
import type { DifficultyLevel } from "@/types/cloze";

const DIFFICULTY_LEVELS: DifficultyLevel[] = ["leicht", "mittel", "schwer", "blind"];

const arbWord = fc.stringMatching(/^[a-zA-Z]{1,12}$/);

interface TestStrophe {
  id: string;
  zeilen: { id: string; text: string }[];
}

const arbStrophe = fc.record({
  id: fc.uuid(),
  zeilen: fc.array(
    fc.record({
      id: fc.uuid(),
      text: fc.array(arbWord, { minLength: 1, maxLength: 10 }).map((w) => w.join(" ")),
    }),
    { minLength: 1, maxLength: 5 },
  ),
});

const arbStrophen = fc.array(arbStrophe, { minLength: 1, maxLength: 6 });
const arbDifficulty = fc.constantFrom<DifficultyLevel>(...DIFFICULTY_LEVELS);

/**
 * Simulates handleStrophenConfirm from the page component:
 * - Filters zeilen by selectedIds
 * - Generates new gaps
 * - Resets answers, feedback, hints, score
 */
function simulateStrophenConfirm(
  strophen: TestStrophe[],
  selectedIds: Set<string>,
  difficulty: DifficultyLevel,
) {
  const zeilen = strophen
    .filter((s) => selectedIds.has(s.id))
    .flatMap((s) => s.zeilen.map((z) => ({ id: z.id, text: z.text })));
  const newGaps = generateGaps(zeilen, difficulty);
  const totalGaps = newGaps.filter((g) => g.isGap).length;

  return {
    activeStrophenIds: selectedIds,
    gaps: newGaps,
    answers: {} as Record<string, string>,
    feedback: {} as Record<string, "correct" | "incorrect" | null>,
    hints: new Set<string>(),
    score: { correct: 0, total: totalGaps },
  };
}

describe("Property 6: State-Reset bei Auswahl-Bestätigung", () => {
  it("after confirming selection: answers empty, feedback empty, hints empty, score reset", () => {
    fc.assert(
      fc.property(arbStrophen, arbDifficulty, (strophen, difficulty) => {
        // Simulate some pre-existing state with filled answers
        const allZeilen = strophen.flatMap((s) =>
          s.zeilen.map((z) => ({ id: z.id, text: z.text })),
        );
        const oldGaps = generateGaps(allZeilen, difficulty);
        const oldGapEntries = oldGaps.filter((g) => g.isGap);

        // Simulate filled state
        const oldAnswers: Record<string, string> = {};
        const oldFeedback: Record<string, "correct" | "incorrect" | null> = {};
        const oldHints = new Set<string>();
        for (const gap of oldGapEntries) {
          oldAnswers[gap.gapId] = gap.word;
          oldFeedback[gap.gapId] = "correct";
          oldHints.add(gap.gapId);
        }

        // Pick a non-empty subset for new selection
        const subsetSize = Math.max(1, Math.floor(strophen.length / 2));
        const selectedIds = new Set(strophen.slice(0, subsetSize).map((s) => s.id));

        // Simulate confirm
        const newState = simulateStrophenConfirm(strophen, selectedIds, difficulty);

        // Verify reset
        expect(Object.keys(newState.answers)).toHaveLength(0);
        expect(Object.keys(newState.feedback)).toHaveLength(0);
        expect(newState.hints.size).toBe(0);
        expect(newState.score.correct).toBe(0);

        const expectedTotal = newState.gaps.filter((g) => g.isGap).length;
        expect(newState.score.total).toBe(expectedTotal);

        // activeStrophenIds should match the selected IDs
        expect(newState.activeStrophenIds).toEqual(selectedIds);
      }),
      { numRuns: 100 },
    );
  });
});
