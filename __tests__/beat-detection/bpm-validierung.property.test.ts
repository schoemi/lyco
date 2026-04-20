/**
 * Property 4: BPM-Eingabe-Validierung
 *
 * Für jeden Eingabewert gilt: Die Validierungsfunktion soll genau dann true zurückgeben,
 * wenn der Wert eine Ganzzahl im Bereich [20, 300] ist. Für alle anderen Werte
 * (nicht-ganzzahlig, außerhalb des Bereichs, nicht-numerisch) soll sie false zurückgeben.
 *
 * **Validates: Requirements 4.2, 4.3, 4.4**
 *
 * Feature: beat-detection, Property 4: BPM-Eingabe-Validierung
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { istGueltigerBpm } from "@/lib/beat-detection/bpm-validierung";

// Generator: Gültige BPM-Werte (Ganzzahlen in [20, 300])
const gueltigerBpmArb = fc.integer({ min: 20, max: 300 });

// Generator: Ganzzahlen außerhalb des gültigen Bereichs
const ausserBereichArb = fc.oneof(
  fc.integer({ min: -1000, max: 19 }),
  fc.integer({ min: 301, max: 10000 }),
);

// Generator: Nicht-ganzzahlige Zahlen (Fließkommazahlen)
const nichtGanzzahlArb = fc
  .tuple(
    fc.integer({ min: 20, max: 300 }),
    fc.double({ min: 0.01, max: 0.99, noNaN: true }),
  )
  .map(([ganzzahl, bruch]) => ganzzahl + bruch);

// Generator: Nicht-numerische Werte
const nichtNumerischArb = fc.oneof(
  fc.string(),
  fc.boolean(),
  fc.constant(null),
  fc.constant(undefined),
  fc.constant(NaN),
  fc.constant(Infinity),
  fc.constant(-Infinity),
  fc.array(fc.integer()),
  fc.dictionary(fc.string(), fc.integer()),
);

describe("Property 4: BPM-Eingabe-Validierung", () => {
  it("akzeptiert alle Ganzzahlen im Bereich [20, 300]", () => {
    fc.assert(
      fc.property(gueltigerBpmArb, (wert) => {
        expect(istGueltigerBpm(wert)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it("lehnt Ganzzahlen außerhalb des Bereichs [20, 300] ab", () => {
    fc.assert(
      fc.property(ausserBereichArb, (wert) => {
        expect(istGueltigerBpm(wert)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it("lehnt nicht-ganzzahlige Zahlen ab", () => {
    fc.assert(
      fc.property(nichtGanzzahlArb, (wert) => {
        expect(istGueltigerBpm(wert)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it("lehnt nicht-numerische Werte ab", () => {
    fc.assert(
      fc.property(nichtNumerischArb, (wert) => {
        expect(istGueltigerBpm(wert)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it("akzeptiert Grenzwerte 20 und 300", () => {
    expect(istGueltigerBpm(20)).toBe(true);
    expect(istGueltigerBpm(300)).toBe(true);
  });

  it("lehnt Grenzwerte 19 und 301 ab", () => {
    expect(istGueltigerBpm(19)).toBe(false);
    expect(istGueltigerBpm(301)).toBe(false);
  });
});
