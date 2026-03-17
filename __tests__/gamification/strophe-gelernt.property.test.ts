// Feature: gamification-progress, Property 7: Strophe-Gelernt-Schwellenwert
import { describe, it, expect } from "vitest";
import fc from "fast-check";

/**
 * Property 7: Strophe-Gelernt-Schwellenwert
 *
 * Für jede Strophe gilt: Wenn der korrektZaehler in der Wiederholung >= 3 ist
 * ODER die Strophe 2x fehlerfrei im Lückentext abgeschlossen wurde,
 * dann ist der Strophen-Fortschritt 100%.
 * Wenn keine der beiden Bedingungen erfüllt ist, ist der Fortschritt < 100%.
 *
 * **Validates: Requirements 4.1, 4.2**
 */

// --- Pure functions modelling the specification ---

interface StropheStatus {
  korrektZaehler: number; // Spaced Repetition correct count
  fehlerfreiCount: number; // Number of error-free cloze completions
}

function istStropheGelernt(status: StropheStatus): boolean {
  return status.korrektZaehler >= 3 || status.fehlerfreiCount >= 2;
}

function getStropheFortschritt(status: StropheStatus): number {
  if (istStropheGelernt(status)) return 100;

  // Partial progress based on learning state
  const srAnteil = Math.min(status.korrektZaehler, 2) / 3; // max 2/3 before threshold
  const clozeAnteil = Math.min(status.fehlerfreiCount, 1) / 2; // max 1/2 before threshold
  const combined = Math.max(srAnteil, clozeAnteil);
  return Math.round(combined * 99); // scale to max 99 (never 100 unless gelernt)
}

// --- Test configuration ---

const PBT_CONFIG = { numRuns: 100 };

// --- Generators ---

/** Generates a StropheStatus with non-negative integer fields */
const stropheStatusArb = fc.record({
  korrektZaehler: fc.integer({ min: 0, max: 20 }),
  fehlerfreiCount: fc.integer({ min: 0, max: 20 }),
});

describe("Property 7 – Strophe-Gelernt-Schwellenwert", () => {
  it("korrektZaehler >= 3 → fortschritt === 100 (regardless of fehlerfreiCount)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 3, max: 20 }),
        fc.integer({ min: 0, max: 20 }),
        (korrektZaehler, fehlerfreiCount) => {
          const status: StropheStatus = { korrektZaehler, fehlerfreiCount };
          expect(getStropheFortschritt(status)).toBe(100);
        }
      ),
      PBT_CONFIG
    );
  });

  it("fehlerfreiCount >= 2 → fortschritt === 100 (regardless of korrektZaehler)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 20 }),
        fc.integer({ min: 2, max: 20 }),
        (korrektZaehler, fehlerfreiCount) => {
          const status: StropheStatus = { korrektZaehler, fehlerfreiCount };
          expect(getStropheFortschritt(status)).toBe(100);
        }
      ),
      PBT_CONFIG
    );
  });

  it("korrektZaehler < 3 AND fehlerfreiCount < 2 → fortschritt < 100", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 2 }),
        fc.integer({ min: 0, max: 1 }),
        (korrektZaehler, fehlerfreiCount) => {
          const status: StropheStatus = { korrektZaehler, fehlerfreiCount };
          expect(getStropheFortschritt(status)).toBeLessThan(100);
        }
      ),
      PBT_CONFIG
    );
  });

  it("fortschritt is always in [0, 100]", () => {
    fc.assert(
      fc.property(stropheStatusArb, (status) => {
        const fortschritt = getStropheFortschritt(status);
        expect(fortschritt).toBeGreaterThanOrEqual(0);
        expect(fortschritt).toBeLessThanOrEqual(100);
      }),
      PBT_CONFIG
    );
  });

  it("fortschritt is always an integer", () => {
    fc.assert(
      fc.property(stropheStatusArb, (status) => {
        const fortschritt = getStropheFortschritt(status);
        expect(Number.isInteger(fortschritt)).toBe(true);
      }),
      PBT_CONFIG
    );
  });
});
