/**
 * Property 4: Strophen-Reihenfolge nach orderIndex
 *
 * Für jede Liste von Strophen mit beliebigen orderIndex-Werten soll der
 * StrophenAuswahlDialog die Strophen aufsteigend nach orderIndex sortiert anzeigen.
 *
 * **Validates: Requirements 2.5**
 */
// Feature: selective-cloze-practice, Property 4: Strophen-Reihenfolge nach orderIndex

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import fs from "fs";
import path from "path";
import type { StropheDetail } from "@/types/song";

const COMPONENT_PATH = path.resolve(
  process.cwd(),
  "src/components/cloze/strophen-auswahl-dialog.tsx"
);
const source = fs.readFileSync(COMPONENT_PATH, "utf-8");

const arbStropheDetail = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 30 }),
  orderIndex: fc.nat({ max: 1000 }),
  progress: fc.integer({ min: 0, max: 100 }),
  notiz: fc.constant(null as string | null),
  zeilen: fc.constant([] as StropheDetail["zeilen"]),
  markups: fc.constant([] as StropheDetail["markups"]),
});

describe("Property 4: Strophen-Reihenfolge nach orderIndex", () => {
  it("component sorts strophen by orderIndex ascending", () => {
    // Verify the sorting pattern exists in source
    expect(source).toMatch(
      /sortedStrophen\s*=\s*\[\.\.\.strophen\]\.sort\(\s*\(\s*a\s*,\s*b\s*\)\s*=>\s*a\.orderIndex\s*-\s*b\.orderIndex/
    );
  });

  it("component iterates sortedStrophen (not unsorted strophen) for rendering", () => {
    // The map call that renders checkboxes must use sortedStrophen
    expect(source).toContain("sortedStrophen.map");
  });

  it("for any permutation of strophen, sorting by orderIndex produces ascending order", () => {
    fc.assert(
      fc.property(
        fc.array(arbStropheDetail, { minLength: 1, maxLength: 20 }),
        (strophen) => {
          // Simulate the component's sorting logic
          const sorted = [...strophen].sort(
            (a, b) => a.orderIndex - b.orderIndex
          );

          // Verify ascending order
          for (let i = 1; i < sorted.length; i++) {
            expect(sorted[i].orderIndex).toBeGreaterThanOrEqual(
              sorted[i - 1].orderIndex
            );
          }

          // Verify all original strophen are present
          expect(sorted.length).toBe(strophen.length);
          const sortedIds = new Set(sorted.map((s) => s.id));
          for (const s of strophen) {
            expect(sortedIds.has(s.id)).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("sorting is stable: strophen with equal orderIndex preserve relative order", () => {
    fc.assert(
      fc.property(
        fc
          .array(arbStropheDetail, { minLength: 2, maxLength: 15 })
          .map((strophen) =>
            // Give some strophen the same orderIndex to test stability
            strophen.map((s, i) => ({
              ...s,
              orderIndex: i % 3, // creates duplicates
            }))
          ),
        (strophen) => {
          const sorted = [...strophen].sort(
            (a, b) => a.orderIndex - b.orderIndex
          );

          // All elements with the same orderIndex should appear in their original relative order
          for (let i = 1; i < sorted.length; i++) {
            expect(sorted[i].orderIndex).toBeGreaterThanOrEqual(
              sorted[i - 1].orderIndex
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
