/**
 * Feature: beat-detection, Property 9: Beat-Marker-Positionierung
 *
 * Für jedes Array von Beat-Positionen und eine Gesamtdauer > 0 gilt:
 * Jeder Beat-Marker soll an der Position (beatMs / durationMs) * 100 Prozent
 * auf dem Fortschrittsbalken platziert werden. Alle Positionen liegen im Bereich [0, 100]%.
 *
 * **Validates: Requirements 8.3**
 */
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { berechneMarkerPosition } from "@/components/songs/beat-marker-overlay";

describe("Feature: beat-detection, Property 9: Beat-Marker-Positionierung", () => {
  it("should place each beat marker at (beatMs / durationMs) * 100 percent, clamped to [0, 100]", () => {
    fc.assert(
      fc.property(
        // Generate an array of beat positions (non-negative integers)
        fc.array(fc.nat({ max: 600_000 }), { minLength: 0, maxLength: 200 }),
        // Generate a total duration > 0
        fc.integer({ min: 1, max: 600_000 }),
        (beatPositionenMs, durationMs) => {
          for (const beatMs of beatPositionenMs) {
            const position = berechneMarkerPosition(beatMs, durationMs);

            // Position must be in [0, 100]
            expect(position).toBeGreaterThanOrEqual(0);
            expect(position).toBeLessThanOrEqual(100);

            // Position should equal (beatMs / durationMs) * 100, clamped to [0, 100]
            const expected = Math.max(0, Math.min(100, (beatMs / durationMs) * 100));
            expect(position).toBeCloseTo(expected, 10);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("should return 0 when durationMs is 0 or negative", () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 600_000 }),
        fc.integer({ min: -10_000, max: 0 }),
        (beatMs, durationMs) => {
          const position = berechneMarkerPosition(beatMs, durationMs);
          expect(position).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("should handle beat positions beyond duration by clamping to 100", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 600_000 }),
        (durationMs) => {
          // Beat position beyond duration
          const beatMs = durationMs + 1000;
          const position = berechneMarkerPosition(beatMs, durationMs);
          expect(position).toBeLessThanOrEqual(100);
          expect(position).toBeGreaterThanOrEqual(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});
