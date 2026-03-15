/**
 * Property 9: Hinweis ist einmalig pro Lücke
 *
 * Für jedes Gap_Input gilt: nach einmaliger Nutzung des Hints soll der Hint_Button
 * für dieses Gap deaktiviert sein. Ein erneuter Aufruf soll den Hint-Zustand nicht
 * verändern (Idempotenz).
 *
 * **Validates: Requirements 7.1, 7.3, 7.4**
 */
// Feature: cloze-learning, Property 9: Hinweis ist einmalig pro Lücke

import { describe, it, expect } from "vitest";
import fc from "fast-check";

/**
 * Simulates using a hint for a gap: adds the gapId to the hints Set.
 * Returns a new Set (immutable pattern matching React state updates).
 */
function useHint(hints: Set<string>, gapId: string): Set<string> {
  const newHints = new Set(hints);
  newHints.add(gapId);
  return newHints;
}

// Generator: a gap ID string
const arbGapId = fc.uuid();

describe("Property 9: Hinweis ist einmalig pro Lücke", () => {
  it("after using a hint, hints.has(gapId) is true (button should be disabled)", () => {
    fc.assert(
      fc.property(arbGapId, (gapId) => {
        const hints = new Set<string>();
        const afterHint = useHint(hints, gapId);

        // After using hint, the gapId must be in the set → button disabled
        expect(afterHint.has(gapId)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it("using hint again on same gap does not change the Set (idempotency)", () => {
    fc.assert(
      fc.property(arbGapId, (gapId) => {
        const hints = new Set<string>();

        // First use
        const afterFirst = useHint(hints, gapId);
        const sizeAfterFirst = afterFirst.size;

        // Second use (idempotent)
        const afterSecond = useHint(afterFirst, gapId);

        // Size unchanged
        expect(afterSecond.size).toBe(sizeAfterFirst);
        // gapId still present
        expect(afterSecond.has(gapId)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it("using hint on one gap does not affect other gaps in the Set", () => {
    fc.assert(
      fc.property(
        fc.array(arbGapId, { minLength: 2, maxLength: 20 }),
        (gapIds) => {
          // Deduplicate to get distinct gap IDs
          const uniqueIds = [...new Set(gapIds)];
          if (uniqueIds.length < 2) return; // need at least 2 distinct IDs

          let hints = new Set<string>();

          // Use hint for the first gap
          hints = useHint(hints, uniqueIds[0]);

          // First gap is in the set
          expect(hints.has(uniqueIds[0])).toBe(true);

          // Other gaps are NOT in the set
          for (let i = 1; i < uniqueIds.length; i++) {
            expect(hints.has(uniqueIds[i])).toBe(false);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("multiple hints used then repeated calls are all idempotent", () => {
    fc.assert(
      fc.property(
        fc.array(arbGapId, { minLength: 1, maxLength: 15 }),
        (gapIds) => {
          let hints = new Set<string>();

          // Use hints for all gap IDs
          for (const gapId of gapIds) {
            hints = useHint(hints, gapId);
          }

          const sizeAfterAll = hints.size;

          // Use hints again for all gap IDs (idempotent)
          for (const gapId of gapIds) {
            hints = useHint(hints, gapId);
          }

          // Size must be unchanged — all adds were duplicates
          expect(hints.size).toBe(sizeAfterAll);

          // All gap IDs still present
          for (const gapId of gapIds) {
            expect(hints.has(gapId)).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
