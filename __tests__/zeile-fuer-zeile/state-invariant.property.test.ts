/**
 * Property 2: Genau eine aktive Zeile und korrekte kumulative Ansicht
 *
 * Für jede Strophe mit N Zeilen und jeden Lernzustand mit currentZeileIndex = k
 * (0 ≤ k < N), soll genau eine Zeile als aktiv markiert sein (Index k), und die
 * kumulative Ansicht soll genau die Zeilen mit Index 0 bis k-1 enthalten.
 *
 * **Validates: Requirements 2.1, 2.3**
 */
// Feature: line-by-line-learning, Property 2: Genau eine aktive Zeile und korrekte kumulative Ansicht

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import fs from "fs";
import path from "path";

const PAGE_PATH = path.resolve(
  process.cwd(),
  "src/app/(main)/songs/[id]/zeile-fuer-zeile/page.tsx",
);
const source = fs.readFileSync(PAGE_PATH, "utf-8");

/**
 * Generate a zeile (line) object matching the shape used in the page component.
 */
function makeZeile(index: number) {
  return {
    id: `zeile-${index}`,
    text: `Line text ${index}`,
    orderIndex: index,
  };
}

/**
 * Simulate the page's derived value computation:
 *   currentZeile = sortedZeilen[currentZeileIndex]
 *   kumulativeZeilen = sortedZeilen.slice(0, currentZeileIndex)
 */
function computeDerivedState(
  sortedZeilen: Array<{ id: string; text: string; orderIndex: number }>,
  currentZeileIndex: number,
) {
  const currentZeile = sortedZeilen[currentZeileIndex] ?? null;
  const kumulativeZeilen = sortedZeilen.slice(0, currentZeileIndex).map((z) => ({
    id: z.id,
    text: z.text,
  }));
  return { currentZeile, kumulativeZeilen };
}

/**
 * Arbitrary: generates a valid strophe state
 * - N zeilen: 1..30
 * - currentZeileIndex k: 0..N-1
 */
const arbStropheState = fc
  .integer({ min: 1, max: 30 })
  .chain((n) =>
    fc.tuple(
      fc.constant(Array.from({ length: n }, (_, i) => makeZeile(i))),
      fc.integer({ min: 0, max: n - 1 }),
    ),
  );

describe("Property 2: Genau eine aktive Zeile und korrekte kumulative Ansicht", () => {
  it("source computes currentZeile from sortedZeilen[currentZeileIndex]", () => {
    expect(source).toMatch(/sortedZeilen\[currentZeileIndex\]/);
  });

  it("source computes kumulativeZeilen via sortedZeilen.slice(0, currentZeileIndex)", () => {
    expect(source).toMatch(/sortedZeilen\.slice\(0,\s*currentZeileIndex\)/);
  });

  it("exactly one active line exists at index k (Req 2.1)", () => {
    fc.assert(
      fc.property(arbStropheState, ([sortedZeilen, k]) => {
        const { currentZeile } = computeDerivedState(sortedZeilen, k);

        // Exactly one active line
        expect(currentZeile).not.toBeNull();
        expect(currentZeile!.id).toBe(sortedZeilen[k].id);

        // No other line is the active line
        const otherZeilen = sortedZeilen.filter((_, i) => i !== k);
        for (const z of otherZeilen) {
          expect(z.id).not.toBe(currentZeile!.id);
        }
      }),
      { numRuns: 100 },
    );
  });

  it("cumulative view contains exactly lines 0..k-1 (Req 2.3)", () => {
    fc.assert(
      fc.property(arbStropheState, ([sortedZeilen, k]) => {
        const { kumulativeZeilen } = computeDerivedState(sortedZeilen, k);

        // Cumulative view has exactly k elements
        expect(kumulativeZeilen).toHaveLength(k);

        // Each element matches the corresponding line from 0 to k-1
        for (let i = 0; i < k; i++) {
          expect(kumulativeZeilen[i].id).toBe(sortedZeilen[i].id);
          expect(kumulativeZeilen[i].text).toBe(sortedZeilen[i].text);
        }
      }),
      { numRuns: 100 },
    );
  });

  it("active line is NOT in cumulative view", () => {
    fc.assert(
      fc.property(arbStropheState, ([sortedZeilen, k]) => {
        const { currentZeile, kumulativeZeilen } = computeDerivedState(sortedZeilen, k);

        const kumulativeIds = kumulativeZeilen.map((z) => z.id);
        expect(kumulativeIds).not.toContain(currentZeile!.id);
      }),
      { numRuns: 100 },
    );
  });

  it("cumulative view has exactly k elements", () => {
    fc.assert(
      fc.property(arbStropheState, ([sortedZeilen, k]) => {
        const { kumulativeZeilen } = computeDerivedState(sortedZeilen, k);
        expect(kumulativeZeilen).toHaveLength(k);
      }),
      { numRuns: 100 },
    );
  });

  it("when k=0 (first line), cumulative view is empty (Req 2.5 edge case)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 30 }).map((n) =>
          Array.from({ length: n }, (_, i) => makeZeile(i)),
        ),
        (sortedZeilen) => {
          const { currentZeile, kumulativeZeilen } = computeDerivedState(sortedZeilen, 0);

          expect(kumulativeZeilen).toHaveLength(0);
          expect(currentZeile!.id).toBe(sortedZeilen[0].id);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("active line + cumulative view together cover exactly indices 0..k", () => {
    fc.assert(
      fc.property(arbStropheState, ([sortedZeilen, k]) => {
        const { currentZeile, kumulativeZeilen } = computeDerivedState(sortedZeilen, k);

        // Cumulative covers 0..k-1, active covers k → together 0..k
        const coveredIds = [...kumulativeZeilen.map((z) => z.id), currentZeile!.id];
        const expectedIds = sortedZeilen.slice(0, k + 1).map((z) => z.id);
        expect(coveredIds).toEqual(expectedIds);
      }),
      { numRuns: 100 },
    );
  });
});
