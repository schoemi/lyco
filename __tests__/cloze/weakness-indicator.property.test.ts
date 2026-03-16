/**
 * Property 7: Schwächen-Indikator bei Fortschritt unter Schwelle
 *
 * Für jede Strophe mit einem Fortschrittswert soll der Schwächen-Indikator
 * genau dann angezeigt werden, wenn der Fortschritt unter 80% liegt.
 *
 * **Validates: Requirements 4.2, 4.3, 7.6**
 */
// Feature: selective-cloze-practice, Property 7: Schwächen-Indikator bei Fortschritt unter Schwelle

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { getWeakStrophenIds } from "@/lib/cloze/strophen-selection";
import { WEAKNESS_THRESHOLD } from "@/lib/cloze/constants";
import type { StropheProgress } from "@/types/song";

const arbStropheProgress = fc.record({
  stropheId: fc.uuid(),
  stropheName: fc.string({ minLength: 1, maxLength: 30 }),
  prozent: fc.integer({ min: 0, max: 100 }),
});

describe("Property 7: Schwächen-Indikator bei Fortschritt unter Schwelle", () => {
  it("getWeakStrophenIds includes exactly the strophes with progress < WEAKNESS_THRESHOLD", () => {
    fc.assert(
      fc.property(
        fc.array(arbStropheProgress, { minLength: 1, maxLength: 20 }),
        (progressList: StropheProgress[]) => {
          const weakIds = getWeakStrophenIds(progressList);

          for (const p of progressList) {
            if (p.prozent < WEAKNESS_THRESHOLD) {
              expect(weakIds.has(p.stropheId)).toBe(true);
            } else {
              expect(weakIds.has(p.stropheId)).toBe(false);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("result set contains no IDs not present in the input", () => {
    fc.assert(
      fc.property(
        fc.array(arbStropheProgress, { minLength: 1, maxLength: 20 }),
        (progressList: StropheProgress[]) => {
          const weakIds = getWeakStrophenIds(progressList);
          const allIds = new Set(progressList.map((p) => p.stropheId));

          for (const id of weakIds) {
            expect(allIds.has(id)).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
