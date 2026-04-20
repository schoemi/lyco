/**
 * Property 2: BPM-Erkennung liefert Werte im gültigen Bereich
 *
 * Für jedes gültige Audio-Signal, das dem Beat-Detektor übergeben wird,
 * soll der erkannte BPM-Wert im Bereich [40, 240] liegen.
 *
 * **Validates: Requirements 2.6**
 *
 * Feature: beat-detection, Property 2: BPM-Erkennung liefert Werte im gültigen Bereich
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { berechneBpm } from "@/lib/beat-detection/beat-algorithmus";

// Generator: Array von aufsteigenden Beat-Positionen in Millisekunden
// Simuliert realistische Beat-Positionen mit variablen Intervallen
const beatPositionenArb = fc
  .array(
    fc.integer({ min: 50, max: 5000 }), // Inter-Beat-Intervalle in ms
    { minLength: 2, maxLength: 200 },
  )
  .map((intervalle) => {
    const positionen: number[] = [0];
    let pos = 0;
    for (const intervall of intervalle) {
      pos += intervall;
      positionen.push(pos);
    }
    return positionen;
  });

// Generator: Einzelne Position oder leeres Array (Edge Cases)
const wenigeBeatPositionen = fc.oneof(
  fc.constant([]),
  fc.integer({ min: 0, max: 100000 }).map((v) => [v]),
  fc.tuple(
    fc.integer({ min: 0, max: 100000 }),
    fc.integer({ min: 0, max: 100000 }),
  ).map(([a, b]) => [a, b]),
);

describe("Property 2: BPM-Erkennung liefert Werte im gültigen Bereich", () => {
  it("berechneBpm liefert immer Werte im Bereich [40, 240] für beliebige Beat-Positionen", () => {
    fc.assert(
      fc.property(beatPositionenArb, (positionen) => {
        const bpm = berechneBpm(positionen);
        expect(bpm).toBeGreaterThanOrEqual(40);
        expect(bpm).toBeLessThanOrEqual(240);
      }),
      { numRuns: 100 },
    );
  });

  it("berechneBpm liefert Werte im Bereich [40, 240] auch für Edge Cases (wenige Positionen)", () => {
    fc.assert(
      fc.property(wenigeBeatPositionen, (positionen) => {
        const bpm = berechneBpm(positionen);
        expect(bpm).toBeGreaterThanOrEqual(40);
        expect(bpm).toBeLessThanOrEqual(240);
      }),
      { numRuns: 100 },
    );
  });

  it("berechneBpm liefert ganzzahlige Werte", () => {
    fc.assert(
      fc.property(beatPositionenArb, (positionen) => {
        const bpm = berechneBpm(positionen);
        expect(Number.isInteger(bpm)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });
});
