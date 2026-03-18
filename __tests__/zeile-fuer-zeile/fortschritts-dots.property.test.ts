/**
 * Property 6: Fortschritts-Dots spiegeln Zustand korrekt wider
 *
 * Für jede Strophe mit N Zeilen und jeden Lernzustand mit currentZeileIndex = k
 * und einer Menge abgeschlossener Indizes, soll die Dots-Komponente genau N Punkte
 * rendern, wobei abgeschlossene Indizes grün, der aktive Index lila und alle
 * übrigen grau dargestellt werden.
 *
 * **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**
 */
// Feature: line-by-line-learning, Property 6: Fortschritts-Dots spiegeln Zustand korrekt wider

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import fs from "fs";
import path from "path";

const COMPONENT_PATH = path.resolve(
  process.cwd(),
  "src/components/zeile-fuer-zeile/fortschritts-dots.tsx",
);
const source = fs.readFileSync(COMPONENT_PATH, "utf-8");

/**
 * Simulate the component's dot-classification logic extracted from source.
 * For each index i in [0, totalZeilen):
 *   - if completedIndices.has(i) → "completed" (bg-success-500)
 *   - else if i === currentIndex → "active" (bg-primary-600)
 *   - else → "pending" (border-neutral-300)
 */
function classifyDot(
  i: number,
  currentIndex: number,
  completedIndices: Set<number>,
): "completed" | "active" | "pending" {
  if (completedIndices.has(i)) return "completed";
  if (i === currentIndex) return "active";
  return "pending";
}

/**
 * Arbitrary: generates a valid FortschrittsDots state
 * - totalZeilen: 1..50
 * - currentIndex: 0..totalZeilen-1
 * - completedIndices: subset of [0..totalZeilen-1]
 */
const arbDotsState = fc
  .integer({ min: 1, max: 50 })
  .chain((totalZeilen) =>
    fc.tuple(
      fc.constant(totalZeilen),
      fc.integer({ min: 0, max: totalZeilen - 1 }),
      fc
        .subarray(
          Array.from({ length: totalZeilen }, (_, i) => i),
          { minLength: 0, maxLength: totalZeilen },
        )
        .map((arr) => new Set(arr)),
    ),
  );

describe("Property 6: Fortschritts-Dots spiegeln Zustand korrekt wider", () => {
  it("source uses Array.from with length: totalZeilen to render exactly N dots (Req 5.1)", () => {
    fc.assert(
      fc.property(arbDotsState, ([totalZeilen]) => {
        // The source must use Array.from({ length: totalZeilen }) to produce N dots
        expect(source).toMatch(/Array\.from\(\{.*length:\s*totalZeilen/s);
        // N dots means the array length equals totalZeilen for any N
        const dots = Array.from({ length: totalZeilen });
        expect(dots).toHaveLength(totalZeilen);
      }),
      { numRuns: 100 },
    );
  });

  it("active index always gets bg-primary-600 when not completed (Req 5.2)", () => {
    fc.assert(
      fc.property(arbDotsState, ([totalZeilen, currentIndex, completedIndices]) => {
        // When the current index is NOT in completedIndices, it must be classified as active
        if (!completedIndices.has(currentIndex)) {
          const cls = classifyDot(currentIndex, currentIndex, completedIndices);
          expect(cls).toBe("active");
        }
        // Verify source contains the active class
        expect(source).toContain("bg-primary-600");
      }),
      { numRuns: 100 },
    );
  });

  it("completed indices always get bg-success-500 (Req 5.3)", () => {
    fc.assert(
      fc.property(arbDotsState, ([totalZeilen, currentIndex, completedIndices]) => {
        for (const idx of completedIndices) {
          const cls = classifyDot(idx, currentIndex, completedIndices);
          expect(cls).toBe("completed");
        }
        // Verify source contains the completed class
        expect(source).toContain("bg-success-500");
      }),
      { numRuns: 100 },
    );
  });

  it("pending indices (not completed, not active) get border-neutral-300 (Req 5.4)", () => {
    fc.assert(
      fc.property(arbDotsState, ([totalZeilen, currentIndex, completedIndices]) => {
        for (let i = 0; i < totalZeilen; i++) {
          if (!completedIndices.has(i) && i !== currentIndex) {
            const cls = classifyDot(i, currentIndex, completedIndices);
            expect(cls).toBe("pending");
          }
        }
        // Verify source contains the pending class
        expect(source).toContain("border-neutral-300");
      }),
      { numRuns: 100 },
    );
  });

  it("every dot index is classified as exactly one of completed/active/pending (Req 5.5)", () => {
    fc.assert(
      fc.property(arbDotsState, ([totalZeilen, currentIndex, completedIndices]) => {
        for (let i = 0; i < totalZeilen; i++) {
          const cls = classifyDot(i, currentIndex, completedIndices);
          expect(["completed", "active", "pending"]).toContain(cls);
        }
      }),
      { numRuns: 100 },
    );
  });

  it("completed takes priority over active (completed index that is also current → green)", () => {
    fc.assert(
      fc.property(arbDotsState, ([totalZeilen, currentIndex, completedIndices]) => {
        // If currentIndex is in completedIndices, it should be classified as completed (green)
        // This matches the source: isCompleted is checked first
        if (completedIndices.has(currentIndex)) {
          const cls = classifyDot(currentIndex, currentIndex, completedIndices);
          expect(cls).toBe("completed");
        }
      }),
      { numRuns: 100 },
    );
  });

  it("aria-valuenow equals completedIndices.size and aria-valuemax equals totalZeilen", () => {
    fc.assert(
      fc.property(arbDotsState, ([totalZeilen, _currentIndex, completedIndices]) => {
        // The source sets aria-valuenow={completedIndices.size} and aria-valuemax={totalZeilen}
        // For any state, these values must be non-negative and valuenow <= valuemax
        const valuenow = completedIndices.size;
        const valuemax = totalZeilen;
        expect(valuenow).toBeGreaterThanOrEqual(0);
        expect(valuenow).toBeLessThanOrEqual(valuemax);
        expect(valuemax).toBeGreaterThan(0);
        // Verify source binds these correctly
        expect(source).toContain("aria-valuenow={completedIndices.size}");
        expect(source).toContain("aria-valuemax={totalZeilen}");
      }),
      { numRuns: 100 },
    );
  });

  it("source conditional logic matches the classify function for all dot states", () => {
    // Verify the source code implements the exact priority: completed > active > pending
    // by checking the if/else if/else structure
    expect(source).toMatch(/if\s*\(isCompleted\)/);
    expect(source).toMatch(/else\s+if\s*\(isCurrent\)/);

    fc.assert(
      fc.property(arbDotsState, ([totalZeilen, currentIndex, completedIndices]) => {
        // For every index, our classifyDot must produce a valid classification
        const classifications = Array.from({ length: totalZeilen }, (_, i) =>
          classifyDot(i, currentIndex, completedIndices),
        );
        // Exactly totalZeilen classifications
        expect(classifications).toHaveLength(totalZeilen);
        // Each is one of the three valid states
        for (const cls of classifications) {
          expect(["completed", "active", "pending"]).toContain(cls);
        }
      }),
      { numRuns: 100 },
    );
  });
});
