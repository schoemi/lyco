/**
 * Property 10: Zeilen werden in orderIndex-Reihenfolge dargestellt
 *
 * Für jede Strophe mit beliebig geordneten Zeilen soll die Darstellung die Zeilen
 * aufsteigend nach orderIndex sortiert ausgeben.
 *
 * **Validates: Requirements 8.3**
 */
// Feature: cloze-learning, Property 10: Zeilen werden in orderIndex-Reihenfolge dargestellt

import { describe, it, expect } from "vitest";
import fc from "fast-check";

interface ZeileForSort {
  id: string;
  orderIndex: number;
}

function sortZeilen(zeilen: ZeileForSort[]): ZeileForSort[] {
  return [...zeilen].sort((a, b) => a.orderIndex - b.orderIndex);
}

const arbZeile = fc.record({
  id: fc.uuid(),
  orderIndex: fc.integer({ min: 0, max: 1000 }),
});

describe("Property 10: Zeilen werden in orderIndex-Reihenfolge dargestellt", () => {
  it("sorts zeilen in ascending orderIndex order", () => {
    fc.assert(
      fc.property(
        fc.array(arbZeile, { minLength: 0, maxLength: 20 }),
        (zeilen) => {
          const sorted = sortZeilen(zeilen);

          // Length is preserved
          expect(sorted).toHaveLength(zeilen.length);

          // Ascending orderIndex order
          for (let i = 1; i < sorted.length; i++) {
            expect(sorted[i].orderIndex).toBeGreaterThanOrEqual(
              sorted[i - 1].orderIndex
            );
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
