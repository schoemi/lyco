/**
 * Property-Tests: DTW-Algorithmus
 *
 * Property 12: DTW Identität – DTW einer Sequenz mit sich selbst ergibt perfektes 1:1-Alignment (cost = 0, path = [[0,0],[1,1],...])
 * Property 13: DTW Symmetrie – `dtw(a, b).cost === dtw(b, a).cost` für beliebige Sequenzen
 * Property 14: DTW Nicht-Negativität – Die DTW-Kosten sind immer ≥ 0
 *
 * **Validates: Requirements 7.1**
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { dtw } from "@/lib/vocal-trainer/dtw";

// --- Generator ---

/** Arbitrary non-empty sequence of MIDI-like values (0–127, no NaN) */
const sequenceArb = fc.array(
  fc.double({ min: 0, max: 127, noNaN: true }),
  { minLength: 1, maxLength: 30 },
);

// --- Property 12: DTW Identität ---

describe("Property 12: DTW Identität", () => {
  it("DTW of a sequence with itself yields cost 0 and perfect 1:1 alignment", () => {
    fc.assert(
      fc.property(sequenceArb, (seq) => {
        const result = dtw(seq, seq);

        // Cost must be 0 for identical sequences
        expect(result.cost).toBe(0);

        // Path must be perfect 1:1 diagonal: [[0,0],[1,1],...,[n-1,n-1]]
        const expectedPath = seq.map((_, i) => [i, i]);
        expect(result.path).toEqual(expectedPath);
      }),
      { numRuns: 200 },
    );
  });
});

// --- Property 13: DTW Symmetrie ---

describe("Property 13: DTW Symmetrie", () => {
  it("dtw(a, b).cost === dtw(b, a).cost for arbitrary sequences", () => {
    fc.assert(
      fc.property(sequenceArb, sequenceArb, (a, b) => {
        const costAB = dtw(a, b).cost;
        const costBA = dtw(b, a).cost;

        expect(costAB).toBe(costBA);
      }),
      { numRuns: 200 },
    );
  });
});

// --- Property 14: DTW Nicht-Negativität ---

describe("Property 14: DTW Nicht-Negativität", () => {
  it("DTW costs are always ≥ 0 for arbitrary sequences", () => {
    fc.assert(
      fc.property(sequenceArb, sequenceArb, (a, b) => {
        const result = dtw(a, b);

        expect(result.cost).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 200 },
    );
  });
});
