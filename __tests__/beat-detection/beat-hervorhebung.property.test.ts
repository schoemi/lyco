/**
 * Feature: beat-detection, Property 10: Beat-Hervorhebung bei Wiedergabe
 *
 * Für jede aktuelle Wiedergabeposition und ein Array von Beat-Positionen gilt:
 * Der hervorgehobene Beat soll derjenige sein, dessen Position am nächsten zur
 * aktuellen Wiedergabeposition liegt und innerhalb eines Toleranzfensters (±50ms) fällt.
 * Wenn kein Beat innerhalb des Fensters liegt, soll kein Beat hervorgehoben sein.
 *
 * **Validates: Requirements 8.4**
 */
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { findeHervorgehobenenBeat } from "@/components/songs/beat-marker-overlay";

describe("Feature: beat-detection, Property 10: Beat-Hervorhebung bei Wiedergabe", () => {
  const TOLERANZ_MS = 50;

  it("should highlight the closest beat within ±50ms tolerance, or null if none", () => {
    fc.assert(
      fc.property(
        // Current playback position
        fc.nat({ max: 600_000 }),
        // Array of beat positions (non-negative integers)
        fc.array(fc.nat({ max: 600_000 }), { minLength: 0, maxLength: 200 }),
        (currentTimeMs, beatPositionenMs) => {
          const result = findeHervorgehobenenBeat(currentTimeMs, beatPositionenMs, TOLERANZ_MS);

          // Find all beats within tolerance
          const beatsInToleranz = beatPositionenMs
            .map((beatMs, index) => ({ beatMs, index, abweichung: Math.abs(currentTimeMs - beatMs) }))
            .filter(({ abweichung }) => abweichung <= TOLERANZ_MS);

          if (beatsInToleranz.length === 0) {
            // No beat within tolerance → result should be null
            expect(result).toBeNull();
          } else {
            // Result should be the index of the closest beat within tolerance
            expect(result).not.toBeNull();

            // The highlighted beat must be within tolerance
            const highlightedBeatMs = beatPositionenMs[result!];
            const highlightedAbweichung = Math.abs(currentTimeMs - highlightedBeatMs);
            expect(highlightedAbweichung).toBeLessThanOrEqual(TOLERANZ_MS);

            // The highlighted beat must be the closest one
            const minAbweichung = Math.min(...beatsInToleranz.map(b => b.abweichung));
            expect(highlightedAbweichung).toBe(minAbweichung);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("should return null for empty beat array", () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 600_000 }),
        (currentTimeMs) => {
          const result = findeHervorgehobenenBeat(currentTimeMs, [], TOLERANZ_MS);
          expect(result).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });

  it("should not highlight beats outside the tolerance window", () => {
    fc.assert(
      fc.property(
        // Generate a current time with enough room for beats outside tolerance on both sides
        fc.integer({ min: TOLERANZ_MS + 2, max: 600_000 - TOLERANZ_MS - 2 }).chain((currentTimeMs) =>
          fc.tuple(
            fc.constant(currentTimeMs),
            fc.array(
              fc.oneof(
                // Beats well below tolerance (at least TOLERANZ_MS + 1 away)
                fc.integer({ min: 0, max: currentTimeMs - TOLERANZ_MS - 1 }),
                // Beats well above tolerance (at least TOLERANZ_MS + 1 away)
                fc.integer({ min: currentTimeMs + TOLERANZ_MS + 1, max: 600_000 }),
              ),
              { minLength: 1, maxLength: 50 },
            ),
          ),
        ),
        ([currentTimeMs, beatPositionenMs]) => {
          const result = findeHervorgehobenenBeat(currentTimeMs, beatPositionenMs, TOLERANZ_MS);
          expect(result).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });
});
