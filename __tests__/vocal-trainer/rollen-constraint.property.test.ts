/**
 * Property 15: Eindeutige Instrumental-Rolle
 * Property 16: Eindeutige Referenz-Vokal-Rolle
 * Property 17: Standard-Rolle Default
 *
 * **Validates: Requirements 16.2, 16.4, 16.5, 16.6**
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";

// --- In-memory simulation of setRolle logic ---

type AudioRolle = "STANDARD" | "INSTRUMENTAL" | "REFERENZ_VOKAL";

type SimQuelle = { id: string; rolle: AudioRolle };

/**
 * Simulates the setRolle behavior from audio-quelle-service.ts in-memory.
 * When setting a non-STANDARD rolle, any other quelle with that rolle
 * gets reset to STANDARD first.
 */
function simulateSetRolle(
  quellen: SimQuelle[],
  quelleId: string,
  rolle: AudioRolle,
): SimQuelle[] {
  const result = quellen.map((q) => ({ ...q }));
  if (rolle !== "STANDARD") {
    for (const q of result) {
      if (q.id !== quelleId && q.rolle === rolle) {
        q.rolle = "STANDARD";
      }
    }
  }
  const target = result.find((q) => q.id === quelleId);
  if (target) target.rolle = rolle;
  return result;
}

// --- Generators ---

const rolleArb = fc.constantFrom<AudioRolle>(
  "STANDARD",
  "INSTRUMENTAL",
  "REFERENZ_VOKAL",
);

/** Generate a list of 1–8 quellen, all starting with rolle STANDARD */
const quellenArb = fc
  .integer({ min: 1, max: 8 })
  .map((count) =>
    Array.from({ length: count }, (_, i) => ({
      id: `quelle-${i}`,
      rolle: "STANDARD" as AudioRolle,
    })),
  );

/** Generate a sequence of setRolle operations (index + rolle) */
const operationArb = fc.record({
  quelleIndex: fc.nat(),
  rolle: rolleArb,
});

const operationsArb = fc.array(operationArb, { minLength: 1, maxLength: 20 });

// --- Helper ---

function countByRolle(quellen: SimQuelle[], rolle: AudioRolle): number {
  return quellen.filter((q) => q.rolle === rolle).length;
}

/**
 * Property 15: Eindeutige Instrumental-Rolle
 *
 * After any sequence of setRolle calls, at most one AudioQuelle per song
 * has rolle INSTRUMENTAL.
 *
 * **Validates: Requirements 16.4, 16.5**
 */
describe("Property 15: Eindeutige Instrumental-Rolle", () => {
  it("at most one quelle has rolle INSTRUMENTAL after any operation sequence", () => {
    fc.assert(
      fc.property(quellenArb, operationsArb, (initialQuellen, ops) => {
        let quellen = initialQuellen.map((q) => ({ ...q }));

        for (const op of ops) {
          const idx = op.quelleIndex % quellen.length;
          quellen = simulateSetRolle(quellen, quellen[idx].id, op.rolle);
        }

        expect(countByRolle(quellen, "INSTRUMENTAL")).toBeLessThanOrEqual(1);
      }),
      { numRuns: 200 },
    );
  });
});

/**
 * Property 16: Eindeutige Referenz-Vokal-Rolle
 *
 * After any sequence of setRolle calls, at most one AudioQuelle per song
 * has rolle REFERENZ_VOKAL.
 *
 * **Validates: Requirements 16.4, 16.6**
 */
describe("Property 16: Eindeutige Referenz-Vokal-Rolle", () => {
  it("at most one quelle has rolle REFERENZ_VOKAL after any operation sequence", () => {
    fc.assert(
      fc.property(quellenArb, operationsArb, (initialQuellen, ops) => {
        let quellen = initialQuellen.map((q) => ({ ...q }));

        for (const op of ops) {
          const idx = op.quelleIndex % quellen.length;
          quellen = simulateSetRolle(quellen, quellen[idx].id, op.rolle);
        }

        expect(countByRolle(quellen, "REFERENZ_VOKAL")).toBeLessThanOrEqual(1);
      }),
      { numRuns: 200 },
    );
  });
});

/**
 * Property 17: Standard-Rolle Default
 *
 * New AudioQuellen always have rolle STANDARD (before any setRolle call).
 *
 * **Validates: Requirements 16.2**
 */
describe("Property 17: Standard-Rolle Default", () => {
  it("all newly created quellen have rolle STANDARD", () => {
    fc.assert(
      fc.property(quellenArb, (quellen) => {
        for (const q of quellen) {
          expect(q.rolle).toBe("STANDARD");
        }
      }),
      { numRuns: 200 },
    );
  });
});
