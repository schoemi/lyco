import { describe, it, expect } from "vitest";
import {
  berechneAbweichungKategorie,
  berechnePitchScore,
  berechneTimingScore,
  berechneGesamtScore,
} from "@/lib/vocal-trainer/scoring";
import type { PitchFrame, ReferenzFrame } from "@/types/vocal-trainer";

// --- berechneAbweichungKategorie ---

describe("berechneAbweichungKategorie", () => {
  it("returns 'gut' for deviations < 50 cents", () => {
    expect(berechneAbweichungKategorie(0)).toBe("gut");
    expect(berechneAbweichungKategorie(25)).toBe("gut");
    expect(berechneAbweichungKategorie(49.9)).toBe("gut");
  });

  it("returns 'akzeptabel' for deviations 50–100 cents", () => {
    expect(berechneAbweichungKategorie(50)).toBe("akzeptabel");
    expect(berechneAbweichungKategorie(75)).toBe("akzeptabel");
    expect(berechneAbweichungKategorie(100)).toBe("akzeptabel");
  });

  it("returns 'fehlerhaft' for deviations > 100 cents", () => {
    expect(berechneAbweichungKategorie(100.1)).toBe("fehlerhaft");
    expect(berechneAbweichungKategorie(200)).toBe("fehlerhaft");
  });

  it("uses absolute value for negative cents", () => {
    expect(berechneAbweichungKategorie(-30)).toBe("gut");
    expect(berechneAbweichungKategorie(-75)).toBe("akzeptabel");
    expect(berechneAbweichungKategorie(-150)).toBe("fehlerhaft");
  });
});

// --- berechnePitchScore ---

function makeNutzerFrame(overrides: Partial<PitchFrame> = {}): PitchFrame {
  return {
    timestampMs: 0,
    f0Hz: 440,
    midiValue: 69,
    isVoiced: true,
    confidence: 0.9,
    ...overrides,
  };
}

function makeReferenzFrame(overrides: Partial<ReferenzFrame> = {}): ReferenzFrame {
  return {
    timestampMs: 0,
    f0Hz: 440,
    midiValue: 69,
    isVoiced: true,
    isOnset: false,
    ...overrides,
  };
}

describe("berechnePitchScore", () => {
  it("returns 100 when all pitches match perfectly", () => {
    const nutzer = [makeNutzerFrame({ f0Hz: 440 }), makeNutzerFrame({ f0Hz: 330 })];
    const referenz = [makeReferenzFrame({ f0Hz: 440 }), makeReferenzFrame({ f0Hz: 330 })];
    expect(berechnePitchScore(nutzer, referenz)).toBe(100);
  });

  it("returns 0 when nutzer frames are empty", () => {
    const referenz = [makeReferenzFrame()];
    expect(berechnePitchScore([], referenz)).toBe(0);
  });

  it("returns 0 when referenz frames are empty", () => {
    const nutzer = [makeNutzerFrame()];
    expect(berechnePitchScore(nutzer, [])).toBe(0);
  });

  it("excludes unvoiced nutzer frames", () => {
    const nutzer = [
      makeNutzerFrame({ isVoiced: false, f0Hz: 200 }),
      makeNutzerFrame({ f0Hz: 440 }),
    ];
    const referenz = [makeReferenzFrame({ f0Hz: 440 })];
    // Only the voiced frame is compared → perfect match
    expect(berechnePitchScore(nutzer, referenz)).toBe(100);
  });

  it("excludes low-confidence nutzer frames", () => {
    const nutzer = [
      makeNutzerFrame({ confidence: 0.3, f0Hz: 200 }),
      makeNutzerFrame({ f0Hz: 440 }),
    ];
    const referenz = [makeReferenzFrame({ f0Hz: 440 })];
    expect(berechnePitchScore(nutzer, referenz)).toBe(100);
  });

  it("returns 50 for all akzeptabel deviations", () => {
    // ~75 cents off: 440 * 2^(75/1200) ≈ 459.4 Hz
    const offsetHz = 440 * Math.pow(2, 75 / 1200);
    const nutzer = [makeNutzerFrame({ f0Hz: offsetHz })];
    const referenz = [makeReferenzFrame({ f0Hz: 440 })];
    expect(berechnePitchScore(nutzer, referenz)).toBe(50);
  });

  it("returns 0 for all fehlerhaft deviations", () => {
    // ~200 cents off
    const offsetHz = 440 * Math.pow(2, 200 / 1200);
    const nutzer = [makeNutzerFrame({ f0Hz: offsetHz })];
    const referenz = [makeReferenzFrame({ f0Hz: 440 })];
    expect(berechnePitchScore(nutzer, referenz)).toBe(0);
  });
});

// --- berechneTimingScore ---

describe("berechneTimingScore", () => {
  it("returns 100 when all onsets match perfectly", () => {
    expect(berechneTimingScore([0, 500, 1000], [0, 500, 1000])).toBe(100);
  });

  it("returns 0 when nutzer onsets are empty", () => {
    expect(berechneTimingScore([], [0, 500])).toBe(0);
  });

  it("returns 0 when referenz onsets are empty", () => {
    expect(berechneTimingScore([0, 500], [])).toBe(0);
  });

  it("returns 50 for all akzeptabel timing deviations", () => {
    // 100ms off each → akzeptabel (50–150ms)
    expect(berechneTimingScore([100, 600], [0, 500])).toBe(50);
  });

  it("returns 0 for all fehlerhaft timing deviations", () => {
    // 200ms off each → fehlerhaft (> 150ms)
    expect(berechneTimingScore([200, 700], [0, 500])).toBe(0);
  });

  it("handles different-length arrays by using shorter length", () => {
    // 3 nutzer, 2 referenz → compare first 2
    expect(berechneTimingScore([0, 500, 1000], [0, 500])).toBe(100);
  });
});

// --- berechneGesamtScore ---

describe("berechneGesamtScore", () => {
  it("returns weighted average (70% pitch, 30% timing)", () => {
    expect(berechneGesamtScore(100, 100)).toBe(100);
    expect(berechneGesamtScore(0, 0)).toBe(0);
    expect(berechneGesamtScore(100, 0)).toBeCloseTo(70);
    expect(berechneGesamtScore(0, 100)).toBeCloseTo(30);
  });

  it("clamps result to [0, 100]", () => {
    // Even with out-of-range inputs, result stays in bounds
    expect(berechneGesamtScore(100, 100)).toBeLessThanOrEqual(100);
    expect(berechneGesamtScore(0, 0)).toBeGreaterThanOrEqual(0);
  });
});
