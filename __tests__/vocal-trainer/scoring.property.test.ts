/**
 * Property-Tests: Scoring-Algorithmen
 *
 * Property 6: Pitch-Score Bereich – Für beliebige Eingaben: 0 ≤ pitchScore ≤ 100
 * Property 7: Timing-Score Bereich – Für beliebige Eingaben: 0 ≤ timingScore ≤ 100
 * Property 8: Gesamt-Score Bereich – Für beliebige pitchScore/timingScore in [0,100]: 0 ≤ gesamtScore ≤ 100
 * Property 9: Gesamt-Score Monotonie – Wenn pitchScore und timingScore steigen, steigt auch gesamtScore
 * Property 10: Perfekter Pitch-Score – Wenn alle Abweichungen 0 Cents sind, pitchScore = 100
 * Property 11: Abweichungskategorie-Grenzen – < 50 → gut, 50–100 → akzeptabel, > 100 → fehlerhaft
 *
 * **Validates: Requirements 7.2, 7.3, 7.4, 7.5, 7.6, 7.7**
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  berechnePitchScore,
  berechneTimingScore,
  berechneGesamtScore,
  berechneAbweichungKategorie,
} from "@/lib/vocal-trainer/scoring";
import type { PitchFrame, ReferenzFrame } from "@/types/vocal-trainer";

// --- Generators ---

/** Positive frequency in human vocal range */
const f0Hz = fc.double({ min: 50, max: 1000, noNaN: true });

/** Generator for a valid voiced PitchFrame */
const pitchFrameArb: fc.Arbitrary<PitchFrame> = fc.record({
  timestampMs: fc.nat({ max: 300_000 }),
  f0Hz: f0Hz,
  midiValue: fc.double({ min: 20, max: 100, noNaN: true }),
  isVoiced: fc.boolean(),
  confidence: fc.double({ min: 0, max: 1, noNaN: true }),
});

/** Generator for a valid ReferenzFrame */
const referenzFrameArb: fc.Arbitrary<ReferenzFrame> = fc.record({
  timestampMs: fc.nat({ max: 300_000 }),
  f0Hz: f0Hz,
  midiValue: fc.double({ min: 20, max: 100, noNaN: true }),
  isVoiced: fc.boolean(),
  isOnset: fc.boolean(),
});

/** Non-empty arrays of frames */
const pitchFramesArb = fc.array(pitchFrameArb, { minLength: 1, maxLength: 50 });
const referenzFramesArb = fc.array(referenzFrameArb, { minLength: 1, maxLength: 50 });

/** Onset timestamps (sorted ascending) */
const onsetsArb = fc
  .array(fc.nat({ max: 300_000 }), { minLength: 1, maxLength: 50 })
  .map((arr) => [...arr].sort((a, b) => a - b));

/** Score value in [0, 100] */
const scoreArb = fc.double({ min: 0, max: 100, noNaN: true });

/** Non-negative cents value */
const nonNegativeCents = fc.double({ min: 0, max: 10_000, noNaN: true });

// --- Property 6: Pitch-Score Bereich ---

describe("Property 6: Pitch-Score Bereich", () => {
  it("0 ≤ pitchScore ≤ 100 for arbitrary PitchFrame[] and ReferenzFrame[]", () => {
    fc.assert(
      fc.property(pitchFramesArb, referenzFramesArb, (nutzer, referenz) => {
        const score = berechnePitchScore(nutzer, referenz);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      }),
      { numRuns: 200 },
    );
  });
});

// --- Property 7: Timing-Score Bereich ---

describe("Property 7: Timing-Score Bereich", () => {
  it("0 ≤ timingScore ≤ 100 for arbitrary onset arrays", () => {
    fc.assert(
      fc.property(onsetsArb, onsetsArb, (nutzerOnsets, referenzOnsets) => {
        const score = berechneTimingScore(nutzerOnsets, referenzOnsets);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      }),
      { numRuns: 200 },
    );
  });
});

// --- Property 8: Gesamt-Score Bereich ---

describe("Property 8: Gesamt-Score Bereich", () => {
  it("0 ≤ gesamtScore ≤ 100 for arbitrary pitchScore/timingScore in [0,100]", () => {
    fc.assert(
      fc.property(scoreArb, scoreArb, (pitchScore, timingScore) => {
        const gesamt = berechneGesamtScore(pitchScore, timingScore);
        expect(gesamt).toBeGreaterThanOrEqual(0);
        expect(gesamt).toBeLessThanOrEqual(100);
      }),
      { numRuns: 200 },
    );
  });
});

// --- Property 9: Gesamt-Score Monotonie ---

describe("Property 9: Gesamt-Score Monotonie", () => {
  it("if pitchScore and timingScore increase, gesamtScore also increases", () => {
    fc.assert(
      fc.property(
        scoreArb,
        scoreArb,
        scoreArb,
        scoreArb,
        (pA, tA, pB, tB) => {
          // Ensure pLow ≤ pHigh and tLow ≤ tHigh with strict inequality on at least one
          const pLow = Math.min(pA, pB);
          const pHigh = Math.max(pA, pB);
          const tLow = Math.min(tA, tB);
          const tHigh = Math.max(tA, tB);

          const scoreLow = berechneGesamtScore(pLow, tLow);
          const scoreHigh = berechneGesamtScore(pHigh, tHigh);

          // Monotone: if both inputs ≥, output ≥
          expect(scoreHigh).toBeGreaterThanOrEqual(scoreLow);
        },
      ),
      { numRuns: 200 },
    );
  });
});

// --- Property 10: Perfekter Pitch-Score ---

describe("Property 10: Perfekter Pitch-Score", () => {
  it("if all deviations are 0 cents (identical f0Hz), pitchScore = 100", () => {
    fc.assert(
      fc.property(
        fc.array(f0Hz, { minLength: 1, maxLength: 50 }),
        (frequencies) => {
          // Build nutzer and referenz frames with identical f0Hz values
          const nutzer: PitchFrame[] = frequencies.map((hz, i) => ({
            timestampMs: i * 20,
            f0Hz: hz,
            midiValue: 69,
            isVoiced: true,
            confidence: 0.9,
          }));
          const referenz: ReferenzFrame[] = frequencies.map((hz, i) => ({
            timestampMs: i * 20,
            f0Hz: hz,
            midiValue: 69,
            isVoiced: true,
            isOnset: false,
          }));

          const score = berechnePitchScore(nutzer, referenz);
          expect(score).toBe(100);
        },
      ),
      { numRuns: 200 },
    );
  });
});

// --- Property 11: Abweichungskategorie-Grenzen ---

describe("Property 11: Abweichungskategorie-Grenzen", () => {
  it("< 50 → gut for arbitrary non-negative cents < 50", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 49.999, noNaN: true }),
        (cents) => {
          expect(berechneAbweichungKategorie(cents)).toBe("gut");
        },
      ),
      { numRuns: 200 },
    );
  });

  it("50–100 → akzeptabel for arbitrary cents in [50, 100]", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 50, max: 100, noNaN: true }),
        (cents) => {
          expect(berechneAbweichungKategorie(cents)).toBe("akzeptabel");
        },
      ),
      { numRuns: 200 },
    );
  });

  it("> 100 → fehlerhaft for arbitrary cents > 100", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 100.001, max: 10_000, noNaN: true }),
        (cents) => {
          expect(berechneAbweichungKategorie(cents)).toBe("fehlerhaft");
        },
      ),
      { numRuns: 200 },
    );
  });
});
