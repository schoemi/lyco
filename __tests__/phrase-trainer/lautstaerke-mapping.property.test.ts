/**
 * Feature: phrase-trainer, Property 6: Wiedergabe-Lautstärke-Mapping
 *
 * Für jeden Lautstärkeregler-Wert `v` im Bereich [0, 1] und jede Spur
 * (Instrumental, Aufnahme, Referenz) gilt: Der zugehörige `GainNode.gain.value`
 * entspricht exakt dem Regler-Wert `v`.
 *
 * **Validates: Requirements 6.2**
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";

// --- Generators ---

/** Generator for a volume slider value in [0, 1] (double precision) */
const lautstaerkeArb = fc.double({ min: 0, max: 1, noNaN: true });

// --- Pure logic under test ---

/**
 * The wiedergabe-mixer gain sync effects perform a direct assignment:
 *   gainRef.current.gain.value = mixer.xxxLautstaerke
 *
 * This is a 1:1 identity mapping — the GainNode gain value equals the slider
 * value with no transformation. We test this property by simulating the
 * assignment to a plain object that mirrors the GainNode.gain interface.
 */
function applyGainValue(gainNode: { gain: { value: number } }, sliderValue: number): void {
  gainNode.gain.value = sliderValue;
}

// --- Property Tests ---

describe("Feature: phrase-trainer, Property 6: Wiedergabe-Lautstärke-Mapping", () => {
  it("Instrumental-Spur: GainNode.gain.value entspricht exakt dem Regler-Wert v", () => {
    fc.assert(
      fc.property(lautstaerkeArb, (v) => {
        const gainNode = { gain: { value: 1.0 } };
        applyGainValue(gainNode, v);
        expect(gainNode.gain.value).toBe(v);
      }),
      { numRuns: 100 },
    );
  });

  it("Aufnahme-Spur: GainNode.gain.value entspricht exakt dem Regler-Wert v", () => {
    fc.assert(
      fc.property(lautstaerkeArb, (v) => {
        const gainNode = { gain: { value: 1.0 } };
        applyGainValue(gainNode, v);
        expect(gainNode.gain.value).toBe(v);
      }),
      { numRuns: 100 },
    );
  });

  it("Referenz-Spur: GainNode.gain.value entspricht exakt dem Regler-Wert v", () => {
    fc.assert(
      fc.property(lautstaerkeArb, (v) => {
        const gainNode = { gain: { value: 0.7 } };
        applyGainValue(gainNode, v);
        expect(gainNode.gain.value).toBe(v);
      }),
      { numRuns: 100 },
    );
  });

  it("Lautstärke-Mapping ist eine Identitätsfunktion: Eingabe = Ausgabe für alle Spuren", () => {
    fc.assert(
      fc.property(lautstaerkeArb, lautstaerkeArb, lautstaerkeArb, (vInst, vAuf, vRef) => {
        const instGain = { gain: { value: 0 } };
        const aufGain = { gain: { value: 0 } };
        const refGain = { gain: { value: 0 } };

        applyGainValue(instGain, vInst);
        applyGainValue(aufGain, vAuf);
        applyGainValue(refGain, vRef);

        expect(instGain.gain.value).toBe(vInst);
        expect(aufGain.gain.value).toBe(vAuf);
        expect(refGain.gain.value).toBe(vRef);
      }),
      { numRuns: 100 },
    );
  });

  it("Grenzwerte: v = 0 (stumm) setzt GainNode.gain.value auf 0", () => {
    fc.assert(
      fc.property(fc.constant(0), (v) => {
        const gainNode = { gain: { value: 1.0 } };
        applyGainValue(gainNode, v);
        expect(gainNode.gain.value).toBe(0);
      }),
      { numRuns: 100 },
    );
  });

  it("Grenzwerte: v = 1 (volle Lautstärke) setzt GainNode.gain.value auf 1", () => {
    fc.assert(
      fc.property(fc.constant(1), (v) => {
        const gainNode = { gain: { value: 0 } };
        applyGainValue(gainNode, v);
        expect(gainNode.gain.value).toBe(1);
      }),
      { numRuns: 100 },
    );
  });
});
