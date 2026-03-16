/**
 * Property 8: Schwächen üben selektiert korrekt
 *
 * Für jede Liste von Strophen-Fortschritten soll getWeakStrophenIds genau die
 * Strophen mit Fortschritt unter 80% auswählen. hasWeaknesses ist false wenn
 * alle >= 80%.
 *
 * **Validates: Requirements 4.4, 4.5**
 */
// Feature: selective-cloze-practice, Property 8: Schwächen üben selektiert korrekt

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  getWeakStrophenIds,
  hasWeaknesses,
} from "@/lib/cloze/strophen-selection";
import { WEAKNESS_THRESHOLD } from "@/lib/cloze/constants";
import type { StropheProgress } from "@/types/song";

const arbStropheProgress = fc.record({
  stropheId: fc.uuid(),
  stropheName: fc.string({ minLength: 1, maxLength: 30 }),
  prozent: fc.integer({ min: 0, max: 100 }),
});

describe("Property 8: Schwächen üben selektiert korrekt", () => {
  it("getWeakStrophenIds selects exactly the strophes below threshold", () => {
    fc.assert(
      fc.property(
        fc.array(arbStropheProgress, { minLength: 1, maxLength: 20 }),
        (progressList: StropheProgress[]) => {
          const weakIds = getWeakStrophenIds(progressList);
          const expectedIds = new Set(
            progressList
              .filter((p) => p.prozent < WEAKNESS_THRESHOLD)
              .map((p) => p.stropheId),
          );

          expect(weakIds).toEqual(expectedIds);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("hasWeaknesses is false when all strophes have progress >= WEAKNESS_THRESHOLD", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            stropheId: fc.uuid(),
            stropheName: fc.string({ minLength: 1, maxLength: 30 }),
            prozent: fc.integer({ min: WEAKNESS_THRESHOLD, max: 100 }),
          }),
          { minLength: 1, maxLength: 20 },
        ),
        (progressList: StropheProgress[]) => {
          expect(hasWeaknesses(progressList)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("hasWeaknesses is true when at least one strophe has progress < WEAKNESS_THRESHOLD", () => {
    fc.assert(
      fc.property(
        fc
          .array(arbStropheProgress, { minLength: 1, maxLength: 20 })
          .filter((list) =>
            list.some((p) => p.prozent < WEAKNESS_THRESHOLD),
          ),
        (progressList: StropheProgress[]) => {
          expect(hasWeaknesses(progressList)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });
});
