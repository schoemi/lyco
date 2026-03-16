/**
 * Property 1: Strophen sind nach orderIndex absteigend sortiert
 *
 * Für beliebige Strophen-Arrays: nach Sortierung ist jeder `orderIndex` ≥ dem nächsten.
 * Testet die absteigende Sortierlogik der RueckwaertsPage.
 *
 * **Validates: Requirements 1.2**
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import type { StropheDetail } from "@/types/song";

/**
 * Replicate the descending sort logic from RueckwaertsPage:
 *   .sort((a, b) => b.orderIndex - a.orderIndex)
 */
function sortStrophenDescending<T extends { orderIndex: number }>(strophen: T[]): T[] {
  return [...strophen].sort((a, b) => b.orderIndex - a.orderIndex);
}

/** Arbitrary strophe with random orderIndex */
const arbStrophe = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 30 }),
  orderIndex: fc.nat({ max: 1000 }),
  progress: fc.integer({ min: 0, max: 100 }),
  notiz: fc.constant(null as string | null),
  analyse: fc.constant(null as string | null),
  zeilen: fc.constant([] as StropheDetail["zeilen"]),
  markups: fc.constant([] as StropheDetail["markups"]),
});

describe("Property 1: Strophen sind nach orderIndex absteigend sortiert", () => {
  it("for any array of strophen, sorting descending produces each orderIndex >= the next", () => {
    fc.assert(
      fc.property(
        fc.array(arbStrophe, { minLength: 0, maxLength: 30 }),
        (strophen) => {
          const sorted = sortStrophenDescending(strophen);

          // Length is preserved
          expect(sorted).toHaveLength(strophen.length);

          // Descending order: each orderIndex >= the next
          for (let i = 1; i < sorted.length; i++) {
            expect(sorted[i - 1].orderIndex).toBeGreaterThanOrEqual(
              sorted[i].orderIndex,
            );
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it("all original strophen are preserved after sorting", () => {
    fc.assert(
      fc.property(
        fc.array(arbStrophe, { minLength: 1, maxLength: 20 }),
        (strophen) => {
          const sorted = sortStrophenDescending(strophen);

          expect(sorted).toHaveLength(strophen.length);

          const sortedIds = new Set(sorted.map((s) => s.id));
          for (const s of strophen) {
            expect(sortedIds.has(s.id)).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("first element has the highest orderIndex, last has the lowest", () => {
    fc.assert(
      fc.property(
        fc.array(arbStrophe, { minLength: 1, maxLength: 20 }),
        (strophen) => {
          const sorted = sortStrophenDescending(strophen);
          const maxOrder = Math.max(...strophen.map((s) => s.orderIndex));
          const minOrder = Math.min(...strophen.map((s) => s.orderIndex));

          expect(sorted[0].orderIndex).toBe(maxOrder);
          expect(sorted[sorted.length - 1].orderIndex).toBe(minOrder);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("filtering by activeStrophenIds then sorting descending still produces descending order", () => {
    fc.assert(
      fc.property(
        fc.array(arbStrophe, { minLength: 2, maxLength: 20 }),
        (strophen) => {
          // Pick a random subset of IDs as "active"
          const allIds = strophen.map((s) => s.id);
          const activeIds = new Set(allIds.filter((_, i) => i % 2 === 0));

          // Replicate the page logic: filter then sort descending
          const filtered = strophen
            .filter((s) => activeIds.has(s.id))
            .sort((a, b) => b.orderIndex - a.orderIndex);

          for (let i = 1; i < filtered.length; i++) {
            expect(filtered[i - 1].orderIndex).toBeGreaterThanOrEqual(
              filtered[i].orderIndex,
            );
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
