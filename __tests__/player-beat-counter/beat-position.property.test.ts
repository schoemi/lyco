/**
 * Feature: player-beat-counter, Property 1: Taktpositions-Berechnung
 * Feature: player-beat-counter, Property 4: SchlagImTakt range [1, taktZaehler] and taktNummer ≥ 1
 *
 * Property-based tests for the berechneBeatPosition pure function.
 *
 * **Validates: Requirements 1.3, 1.4, 3.1, 3.2, 3.4**
 */
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { berechneBeatPosition } from "@/hooks/use-beat-position";

/**
 * Generator for sorted arrays of beat positions (non-negative, strictly increasing).
 */
const sortedBeatPositions = (minLength = 1) =>
  fc
    .array(fc.nat({ max: 600_000 }), {
      minLength,
      maxLength: 200,
    })
    .map((arr) => [...new Set(arr)].sort((a, b) => a - b))
    .filter((arr) => arr.length >= minLength);

describe("Feature: player-beat-counter, Property 1: Taktpositions-Berechnung", () => {
  it("taktNummer = floor(beatIndex/taktZaehler)+1 and schlagImTakt = (beatIndex%taktZaehler)+1 for any valid input", () => {
    fc.assert(
      fc.property(
        sortedBeatPositions(),
        fc.integer({ min: 1, max: 16 }),
        (beatPositionenMs, taktZaehler) => {
          // Pick a currentTimeMs that is ≥ the first beat
          const firstBeat = beatPositionenMs[0];
          const lastBeat = beatPositionenMs[beatPositionenMs.length - 1];

          // Test at a time equal to the last beat (guaranteed to have a result)
          for (const currentTimeMs of [firstBeat, lastBeat]) {
            const result = berechneBeatPosition(
              beatPositionenMs,
              currentTimeMs,
              taktZaehler,
            );

            expect(result).not.toBeNull();
            if (result === null) return;

            // Verify beatIndex: the last beat ≤ currentTimeMs
            expect(beatPositionenMs[result.beatIndex]).toBeLessThanOrEqual(
              currentTimeMs,
            );
            // No beat after beatIndex should be ≤ currentTimeMs
            if (result.beatIndex < beatPositionenMs.length - 1) {
              expect(
                beatPositionenMs[result.beatIndex + 1],
              ).toBeGreaterThan(currentTimeMs);
            }

            // Verify formulas
            expect(result.taktNummer).toBe(
              Math.floor(result.beatIndex / taktZaehler) + 1,
            );
            expect(result.schlagImTakt).toBe(
              (result.beatIndex % taktZaehler) + 1,
            );
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("taktNummer and schlagImTakt formulas hold for random currentTimeMs within beat range", () => {
    fc.assert(
      fc.property(
        sortedBeatPositions(),
        fc.integer({ min: 1, max: 16 }),
        fc.nat({ max: 600_000 }),
        (beatPositionenMs, taktZaehler, currentTimeMs) => {
          // Only test when currentTimeMs ≥ first beat
          if (currentTimeMs < beatPositionenMs[0]) return;

          const result = berechneBeatPosition(
            beatPositionenMs,
            currentTimeMs,
            taktZaehler,
          );

          expect(result).not.toBeNull();
          if (result === null) return;

          expect(result.taktNummer).toBe(
            Math.floor(result.beatIndex / taktZaehler) + 1,
          );
          expect(result.schlagImTakt).toBe(
            (result.beatIndex % taktZaehler) + 1,
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe("Feature: player-beat-counter, Property 4: SchlagImTakt range [1, taktZaehler] and taktNummer ≥ 1", () => {
  it("schlagImTakt is always in [1, taktZaehler] and taktNummer is always ≥ 1", () => {
    fc.assert(
      fc.property(
        sortedBeatPositions(),
        fc.integer({ min: 1, max: 16 }),
        fc.nat({ max: 600_000 }),
        (beatPositionenMs, taktZaehler, currentTimeMs) => {
          // Only test when currentTimeMs ≥ first beat
          if (currentTimeMs < beatPositionenMs[0]) return;

          const result = berechneBeatPosition(
            beatPositionenMs,
            currentTimeMs,
            taktZaehler,
          );

          expect(result).not.toBeNull();
          if (result === null) return;

          // schlagImTakt must be in [1, taktZaehler]
          expect(result.schlagImTakt).toBeGreaterThanOrEqual(1);
          expect(result.schlagImTakt).toBeLessThanOrEqual(taktZaehler);

          // taktNummer must be ≥ 1
          expect(result.taktNummer).toBeGreaterThanOrEqual(1);

          // beatIndex must be a valid index
          expect(result.beatIndex).toBeGreaterThanOrEqual(0);
          expect(result.beatIndex).toBeLessThan(beatPositionenMs.length);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("schlagImTakt range holds for invalid taktZaehler (falls back to 4)", () => {
    fc.assert(
      fc.property(
        sortedBeatPositions(),
        fc.integer({ min: -10, max: 0 }),
        (beatPositionenMs, invalidTaktZaehler) => {
          const lastBeat = beatPositionenMs[beatPositionenMs.length - 1];

          const result = berechneBeatPosition(
            beatPositionenMs,
            lastBeat,
            invalidTaktZaehler,
          );

          expect(result).not.toBeNull();
          if (result === null) return;

          // Should fall back to default 4
          expect(result.schlagImTakt).toBeGreaterThanOrEqual(1);
          expect(result.schlagImTakt).toBeLessThanOrEqual(4);
          expect(result.taktNummer).toBeGreaterThanOrEqual(1);
        },
      ),
      { numRuns: 100 },
    );
  });
});
