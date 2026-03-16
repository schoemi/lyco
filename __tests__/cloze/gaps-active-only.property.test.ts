/**
 * Property 5: Lücken nur für aktive Strophen
 *
 * Für jeden Song und jede nicht-leere Teilmenge ausgewählter Strophen sollen nach
 * Bestätigung der Auswahl alle generierten GapData-Einträge ausschließlich zu Zeilen
 * gehören, die Teil der aktiven Strophen sind.
 *
 * **Validates: Requirements 3.2, 3.3**
 */
// Feature: selective-cloze-practice, Property 5: Lücken nur für aktive Strophen

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

// Generator: a strophe with unique IDs and at least 1 zeile
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

// Generator: array of strophes (at least 2 so we can have a proper subset)
const arbStrophen = fc.array(arbStrophe, { minLength: 2, maxLength: 6 });

const arbDifficulty = fc.constantFrom<DifficultyLevel>(...DIFFICULTY_LEVELS);

/**
 * Simulates getZeilenFromSong filtering + generateGaps as done in the page component.
 */
function getZeilenForActiveStrophen(
  strophen: TestStrophe[],
  activeIds: Set<string>,
) {
  return strophen
    .filter((s) => activeIds.has(s.id))
    .flatMap((s) => s.zeilen.map((z) => ({ id: z.id, text: z.text })));
}

describe("Property 5: Lücken nur für aktive Strophen", () => {
  it("generated gaps only reference zeilen from active strophes", () => {
    fc.assert(
      fc.property(arbStrophen, arbDifficulty, (strophen, difficulty) => {
        // Pick a non-empty subset of strophes
        const subsetSize = Math.max(1, Math.floor(strophen.length / 2));
        const activeIds = new Set(strophen.slice(0, subsetSize).map((s) => s.id));

        // Collect zeile IDs that belong to active strophes
        const activeZeileIds = new Set(
          strophen
            .filter((s) => activeIds.has(s.id))
            .flatMap((s) => s.zeilen.map((z) => z.id)),
        );

        // Collect zeile IDs that belong to inactive strophes
        const inactiveZeileIds = new Set(
          strophen
            .filter((s) => !activeIds.has(s.id))
            .flatMap((s) => s.zeilen.map((z) => z.id)),
        );

        // Generate gaps only for active strophes (as the page does)
        const zeilen = getZeilenForActiveStrophen(strophen, activeIds);
        const gaps = generateGaps(zeilen, difficulty);

        // All gaps must reference zeilen from active strophes only
        for (const gap of gaps) {
          expect(activeZeileIds.has(gap.zeileId)).toBe(true);
          expect(inactiveZeileIds.has(gap.zeileId)).toBe(false);
        }
      }),
      { numRuns: 100 },
    );
  });
});
