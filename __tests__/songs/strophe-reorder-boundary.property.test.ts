/**
 * Property 7: Strophe reorder boundary enforcement
 *
 * Für jede Liste von Strophen, sortiert nach orderIndex:
 * - Die erste Strophe (idx === 0) darf nicht nach oben verschoben werden (Hoch-Button deaktiviert)
 * - Die letzte Strophe (idx === sorted.length - 1) darf nicht nach unten verschoben werden (Runter-Button deaktiviert)
 * - Mittlere Strophen (0 < idx < sorted.length - 1) dürfen in beide Richtungen verschoben werden
 *
 * Tested via source analysis of StropheEditor component and direct logic verification.
 *
 * **Validates: Requirements 7.4, 7.5**
 */
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import fs from "fs";
import path from "path";

// --- Source analysis helpers ---

const STROPHE_EDITOR_PATH = "src/components/songs/strophe-editor.tsx";

function readComponentSource(): string {
  const fullPath = path.resolve(process.cwd(), STROPHE_EDITOR_PATH);
  return fs.readFileSync(fullPath, "utf-8");
}

// --- Boundary logic extracted from StropheEditor ---

/**
 * Replicates the boundary logic from StropheEditor:
 * - sorted = [...strophen].sort((a, b) => a.orderIndex - b.orderIndex)
 * - For each strophe at index `idx` in sorted:
 *   - up button disabled when: idx === 0
 *   - down button disabled when: idx === sorted.length - 1
 */
interface StropheItem {
  id: string;
  orderIndex: number;
}

function computeBoundaryStates(strophen: StropheItem[]): {
  id: string;
  upDisabled: boolean;
  downDisabled: boolean;
}[] {
  const sorted = [...strophen].sort((a, b) => a.orderIndex - b.orderIndex);
  return sorted.map((s, idx) => ({
    id: s.id,
    upDisabled: idx === 0,
    downDisabled: idx === sorted.length - 1,
  }));
}

// --- Arbitraries ---

/** Generate a strophe item with a unique orderIndex */
const stropheItemArb = (index: number): fc.Arbitrary<StropheItem> =>
  fc.record({
    id: fc.constant(`strophe-${index}`),
    orderIndex: fc.constant(index),
  });

/** Generate an array of 1-10 strophen with sequential orderIndices, then shuffle */
const strophenArrayArb = fc
  .integer({ min: 1, max: 10 })
  .chain((count) => {
    const items = Array.from({ length: count }, (_, i) => i);
    return fc.shuffledSubarray(items, { minLength: count, maxLength: count }).map(
      (shuffled) =>
        shuffled.map((orderIndex, i) => ({
          id: `strophe-${i}`,
          orderIndex,
        }))
    );
  });

describe("Property 7: Strophe reorder boundary enforcement", () => {
  // --- Source analysis: verify the component implements boundary checks ---
  it("StropheEditor source contains disabled={idx === 0} for up button", () => {
    const source = readComponentSource();

    // The up button must have a disabled condition that includes idx === 0
    const hasUpBoundary = /disabled\s*=\s*\{[^}]*idx\s*===\s*0/.test(source);
    expect(hasUpBoundary).toBe(true);
  });

  it("StropheEditor source contains disabled={idx === sorted.length - 1} for down button", () => {
    const source = readComponentSource();

    // The down button must have a disabled condition that includes idx === sorted.length - 1
    const hasDownBoundary = /disabled\s*=\s*\{[^}]*idx\s*===\s*sorted\.length\s*-\s*1/.test(source);
    expect(hasDownBoundary).toBe(true);
  });

  // --- Property tests: verify boundary logic correctness ---
  it("first strophe (index 0) always has up-move disabled", () => {
    fc.assert(
      fc.property(strophenArrayArb, (strophen) => {
        const states = computeBoundaryStates(strophen);
        // The first item in sorted order must have upDisabled = true
        expect(states[0].upDisabled).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it("last strophe (index N-1) always has down-move disabled", () => {
    fc.assert(
      fc.property(strophenArrayArb, (strophen) => {
        const states = computeBoundaryStates(strophen);
        // The last item in sorted order must have downDisabled = true
        expect(states[states.length - 1].downDisabled).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it("for arrays with N >= 2, middle strophen have both moves enabled", () => {
    const multiStrophenArb = fc
      .integer({ min: 3, max: 10 })
      .chain((count) => {
        const items = Array.from({ length: count }, (_, i) => i);
        return fc.shuffledSubarray(items, { minLength: count, maxLength: count }).map(
          (shuffled) =>
            shuffled.map((orderIndex, i) => ({
              id: `strophe-${i}`,
              orderIndex,
            }))
        );
      });

    fc.assert(
      fc.property(multiStrophenArb, (strophen) => {
        const states = computeBoundaryStates(strophen);
        // All middle items (not first, not last) should have both moves enabled
        for (let i = 1; i < states.length - 1; i++) {
          expect(states[i].upDisabled).toBe(false);
          expect(states[i].downDisabled).toBe(false);
        }
      }),
      { numRuns: 100 }
    );
  });

  it("single strophe has both up and down disabled", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        (orderIndex) => {
          const strophen: StropheItem[] = [{ id: "only-one", orderIndex }];
          const states = computeBoundaryStates(strophen);
          expect(states).toHaveLength(1);
          expect(states[0].upDisabled).toBe(true);
          expect(states[0].downDisabled).toBe(true);
        }
      ),
      { numRuns: 50 }
    );
  });

  it("boundary states are independent of input order (sorting is applied)", () => {
    fc.assert(
      fc.property(strophenArrayArb, (strophen) => {
        // Compute states from the original (possibly shuffled) input
        const states1 = computeBoundaryStates(strophen);
        // Compute states from a reversed input
        const reversed = [...strophen].reverse();
        const states2 = computeBoundaryStates(reversed);

        // Both should produce the same boundary states when sorted by orderIndex
        expect(states1.length).toBe(states2.length);
        for (let i = 0; i < states1.length; i++) {
          expect(states1[i].upDisabled).toBe(states2[i].upDisabled);
          expect(states1[i].downDisabled).toBe(states2[i].downDisabled);
        }
      }),
      { numRuns: 50 }
    );
  });
});
