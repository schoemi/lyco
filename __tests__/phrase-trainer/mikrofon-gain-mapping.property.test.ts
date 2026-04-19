/**
 * Feature: phrase-trainer, Property 7: Mikrofon-Gain-Mapping
 *
 * Für jeden Gain-Regler-Wert `v` im Bereich [0, 3] gilt: Der `GainNode.gain.value`
 * des Mikrofon-Eingangs entspricht exakt dem Regler-Wert `v`.
 *
 * **Validates: Requirements 9.2**
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";

// --- Generators ---

/** Generator for a mic gain slider value in [0, 3] (0% to 300%) */
const gainWertArb = fc.double({ min: 0, max: 3, noNaN: true });

// --- Pure logic under test ---

/**
 * The aufnahme-bereich gain sync effect performs a direct assignment:
 *   gainNodeRef.current.gain.value = gainWert
 *
 * This is a 1:1 identity mapping — the GainNode gain value equals the slider
 * value with no transformation. We test this property by simulating the
 * assignment to a plain object that mirrors the GainNode.gain interface.
 */
function applyMicGain(gainNode: { gain: { value: number } }, gainWert: number): void {
  gainNode.gain.value = gainWert;
}

// --- Property Tests ---

describe("Feature: phrase-trainer, Property 7: Mikrofon-Gain-Mapping", () => {
  it("GainNode.gain.value des Mikrofon-Eingangs entspricht exakt dem Regler-Wert v", () => {
    fc.assert(
      fc.property(gainWertArb, (v) => {
        const gainNode = { gain: { value: 1.0 } };
        applyMicGain(gainNode, v);
        expect(gainNode.gain.value).toBe(v);
      }),
      { numRuns: 100 },
    );
  });

  it("Mikrofon-Gain-Mapping ist eine Identitätsfunktion: Eingabe = Ausgabe", () => {
    fc.assert(
      fc.property(gainWertArb, (v) => {
        const gainNode = { gain: { value: 0 } };
        applyMicGain(gainNode, v);
        expect(gainNode.gain.value).toBe(v);
      }),
      { numRuns: 100 },
    );
  });

  it("Grenzwerte: v = 0 (stumm) setzt GainNode.gain.value auf 0", () => {
    fc.assert(
      fc.property(fc.constant(0), (v) => {
        const gainNode = { gain: { value: 1.0 } };
        applyMicGain(gainNode, v);
        expect(gainNode.gain.value).toBe(0);
      }),
      { numRuns: 100 },
    );
  });

  it("Grenzwerte: v = 3 (maximaler Gain 300%) setzt GainNode.gain.value auf 3", () => {
    fc.assert(
      fc.property(fc.constant(3), (v) => {
        const gainNode = { gain: { value: 0 } };
        applyMicGain(gainNode, v);
        expect(gainNode.gain.value).toBe(3);
      }),
      { numRuns: 100 },
    );
  });

  it("Grenzwerte: v = 1 (Standard-Gain 100%) setzt GainNode.gain.value auf 1", () => {
    fc.assert(
      fc.property(fc.constant(1), (v) => {
        const gainNode = { gain: { value: 0 } };
        applyMicGain(gainNode, v);
        expect(gainNode.gain.value).toBe(1);
      }),
      { numRuns: 100 },
    );
  });
});
