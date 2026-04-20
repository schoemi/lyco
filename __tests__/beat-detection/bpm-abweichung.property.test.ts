/**
 * Property 5: BPM-Abweichungsberechnung
 *
 * Für jedes Paar von BPM-Werten (manuell, detektiert) mit detektiert > 0 gilt:
 * Die berechnete prozentuale Abweichung soll |manuell - detektiert| / detektiert * 100 entsprechen.
 * Die Validierung soll genau dann als „übereinstimmend" gelten, wenn die Abweichung kleiner als 5% ist.
 *
 * **Validates: Requirements 5.2, 5.3**
 *
 * Feature: beat-detection, Property 5: BPM-Abweichungsberechnung
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { berechneAbweichungProzent } from "@/lib/beat-detection/beat-algorithmus";
import { validiereManuellenBpm } from "@/lib/beat-detection/bpm-validierung";

// Generator: Positive BPM-Werte (realistischer Bereich)
const bpmArb = fc.integer({ min: 20, max: 300 });

// Generator: Positive detektierte BPM-Werte (muss > 0 sein)
const detektiertBpmArb = fc.integer({ min: 1, max: 300 });

describe("Property 5: BPM-Abweichungsberechnung", () => {
  it("berechneAbweichungProzent entspricht der Formel |manuell - detektiert| / detektiert * 100", () => {
    fc.assert(
      fc.property(bpmArb, detektiertBpmArb, (manuell, detektiert) => {
        const ergebnis = berechneAbweichungProzent(manuell, detektiert);
        const erwartet = Math.abs(manuell - detektiert) / detektiert * 100;
        expect(ergebnis).toBeCloseTo(erwartet, 10);
      }),
      { numRuns: 100 },
    );
  });

  it("Abweichung ist immer >= 0", () => {
    fc.assert(
      fc.property(bpmArb, detektiertBpmArb, (manuell, detektiert) => {
        const ergebnis = berechneAbweichungProzent(manuell, detektiert);
        expect(ergebnis).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 100 },
    );
  });

  it("Abweichung ist 0 wenn manuell === detektiert", () => {
    fc.assert(
      fc.property(detektiertBpmArb, (bpm) => {
        const ergebnis = berechneAbweichungProzent(bpm, bpm);
        expect(ergebnis).toBe(0);
      }),
      { numRuns: 100 },
    );
  });

  it("validiereManuellenBpm gibt uebereinstimmung=true genau dann wenn Abweichung < 5%", () => {
    fc.assert(
      fc.property(bpmArb, detektiertBpmArb, (manuell, detektiert) => {
        const ergebnis = validiereManuellenBpm(manuell, detektiert);
        const abweichung = Math.abs(manuell - detektiert) / detektiert * 100;

        if (abweichung < 5) {
          expect(ergebnis.uebereinstimmung).toBe(true);
        } else {
          expect(ergebnis.uebereinstimmung).toBe(false);
        }

        expect(ergebnis.abweichungProzent).toBeCloseTo(abweichung, 10);
      }),
      { numRuns: 100 },
    );
  });
});
