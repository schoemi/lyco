/**
 * Property 3: Cursor left-third positioning
 *
 * Für alle `currentTimeMs` und `windowDurationMs > 0` gilt:
 * Die X-Position des Wiedergabe-Cursors liegt im linken Drittel der SVG-Breite.
 *
 * **Validates: Requirement 4.2**
 */
// Feature: karaoke-pitch-display, Property 3: Cursor left-third positioning

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  berechneViewport,
  berechneSvgX,
} from "@/lib/pitch-display/pitch-coordinates";

// Generator: positive window duration in the valid range (10_000–30_000 ms)
const arbWindowDurationMs = fc.integer({ min: 10_000, max: 30_000 });

// Generator: current time position in a realistic song range (0–600_000 ms = 10 min)
const arbCurrentTimeMs = fc.integer({ min: 0, max: 600_000 });

// Generator: SVG width in a realistic range (200–2000 px)
const arbSvgWidth = fc.integer({ min: 200, max: 2000 });

describe("Property 3: Cursor left-third positioning", () => {
  it("cursor x-position falls within the left third of the SVG width for any currentTimeMs and windowDurationMs > 0", () => {
    fc.assert(
      fc.property(
        arbCurrentTimeMs,
        arbWindowDurationMs,
        arbSvgWidth,
        (currentTimeMs, windowDurationMs, svgWidth) => {
          const viewport = berechneViewport(currentTimeMs, windowDurationMs);
          const cursorX = berechneSvgX(currentTimeMs, viewport, svgWidth);

          // The cursor should be positioned at exactly 1/3 of the SVG width,
          // which is within the left third [0, svgWidth / 3].
          // We use a small epsilon for floating-point tolerance.
          const leftThirdBound = svgWidth / 3;

          expect(cursorX).toBeGreaterThanOrEqual(-0.001);
          expect(cursorX).toBeLessThanOrEqual(leftThirdBound + 0.001);
        },
      ),
      { numRuns: 200 },
    );
  });
});
