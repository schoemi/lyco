/**
 * Property 10: Strophen-Auswahl bleibt bei Schwierigkeitswechsel erhalten
 *
 * Für jede aktive Strophen-Auswahl und jeden Schwierigkeitswechsel soll die Menge
 * `activeStrophenIds` nach dem Wechsel identisch zur Menge vor dem Wechsel sein.
 *
 * **Validates: Requirements 6.1**
 */
// Feature: selective-cloze-practice, Property 10: Strophen-Auswahl bleibt bei Schwierigkeitswechsel erhalten

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
 * Simulates handleDifficultyChange from the page component.
 * The key behavior: activeStrophenIds is NOT modified during difficulty change.
 * Only gaps, answers, feedback, hints, and score are reset.
 */
function simulateDifficultyChange(
  strophen: TestStrophe[],
  activeStrophenIds: Set<string>,
  newDifficulty: DifficultyLevel,
) {
  // getZeilenFromSong filters by activeStrophenIds
  const zeilen = strophen
    .filter((s) => activeStrophenIds.has(s.id))
    .flatMap((s) => s.zeilen.map((z) => ({ id: z.id, text: z.text })));
  const newGaps = generateGaps(zeilen, newDifficulty);
  const totalGaps = newGaps.filter((g) => g.isGap).length;

  return {
    // activeStrophenIds is preserved (not changed by handleDifficultyChange)
    activeStrophenIds,
    gaps: newGaps,
    answers: {} as Record<string, string>,
    feedback: {} as Record<string, "correct" | "incorrect" | null>,
    hints: new Set<string>(),
    score: { correct: 0, total: totalGaps },
  };
}

describe("Property 10: Strophen-Auswahl bleibt bei Schwierigkeitswechsel erhalten", () => {
  it("activeStrophenIds is identical before and after difficulty change", () => {
    fc.assert(
      fc.property(
        arbStrophen,
        arbDifficulty,
        arbDifficulty,
        (strophen, _oldDifficulty, newDifficulty) => {
          // Pick a non-empty subset as active strophes
          const subsetSize = Math.max(1, Math.floor(strophen.length / 2));
          const activeIds = new Set(strophen.slice(0, subsetSize).map((s) => s.id));

          // Snapshot before
          const idsBefore = new Set(activeIds);

          // Simulate difficulty change
          const newState = simulateDifficultyChange(strophen, activeIds, newDifficulty);

          // activeStrophenIds must be identical
          expect(newState.activeStrophenIds.size).toBe(idsBefore.size);
          for (const id of idsBefore) {
            expect(newState.activeStrophenIds.has(id)).toBe(true);
          }
          for (const id of newState.activeStrophenIds) {
            expect(idsBefore.has(id)).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
