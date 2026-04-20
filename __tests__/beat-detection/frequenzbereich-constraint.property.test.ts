/**
 * Property 3: Frequenzbereich-Constraint-Durchsetzung
 *
 * Für jedes Paar von Frequenzwerten (untergrenze, obergrenze) gilt:
 * Nach Anwendung der Constraint-Logik soll untergrenze < obergrenze gelten.
 * Beide Werte bleiben im Bereich [20, 20000].
 *
 * **Validates: Requirements 3.2, 3.4, 3.5**
 *
 * Feature: beat-detection, Property 3: Frequenzbereich-Constraint-Durchsetzung
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { erzwingeFrequenzConstraints } from "@/lib/beat-detection/beat-utils";

// Generator: Beliebige Frequenzwerte (auch außerhalb des gültigen Bereichs)
const frequenzWertArb = fc.double({ min: -1000, max: 25000, noNaN: true });

// Generator: Frequenzwerte im gültigen Bereich
const gueltigerFrequenzWertArb = fc.integer({ min: 20, max: 20000 });

describe("Property 3: Frequenzbereich-Constraint-Durchsetzung", () => {
  it("untergrenze < obergrenze gilt immer nach Constraint-Anwendung", () => {
    fc.assert(
      fc.property(frequenzWertArb, frequenzWertArb, (ug, og) => {
        const result = erzwingeFrequenzConstraints(ug, og);
        expect(result.untergrenze).toBeLessThan(result.obergrenze);
      }),
      { numRuns: 100 },
    );
  });

  it("beide Werte liegen im Bereich [20, 20000]", () => {
    fc.assert(
      fc.property(frequenzWertArb, frequenzWertArb, (ug, og) => {
        const result = erzwingeFrequenzConstraints(ug, og);
        expect(result.untergrenze).toBeGreaterThanOrEqual(20);
        expect(result.untergrenze).toBeLessThanOrEqual(20000);
        expect(result.obergrenze).toBeGreaterThanOrEqual(20);
        expect(result.obergrenze).toBeLessThanOrEqual(20000);
      }),
      { numRuns: 100 },
    );
  });

  it("gültige Werte mit untergrenze < obergrenze bleiben unverändert", () => {
    fc.assert(
      fc.property(
        gueltigerFrequenzWertArb,
        gueltigerFrequenzWertArb,
        (ug, og) => {
          // Only test when ug < og (valid input)
          fc.pre(ug < og);
          const result = erzwingeFrequenzConstraints(ug, og);
          expect(result.untergrenze).toBe(ug);
          expect(result.obergrenze).toBe(og);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("Ergebniswerte sind ganzzahlig", () => {
    fc.assert(
      fc.property(frequenzWertArb, frequenzWertArb, (ug, og) => {
        const result = erzwingeFrequenzConstraints(ug, og);
        expect(Number.isInteger(result.untergrenze)).toBe(true);
        expect(Number.isInteger(result.obergrenze)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });
});
