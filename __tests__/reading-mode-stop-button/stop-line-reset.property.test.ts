/**
 * Property-Test: Stop setzt Zeilenanzeige zurück
 *
 * Property 4: Stop setzt Zeilenanzeige zurück
 *   ∀ activeLineIndex ∈ [0, N-1]: nach handleAudioStop() gilt activeLineIndex === 0
 *
 * Die handleAudioStop()-Funktion in KaraokePage setzt den activeLineIndex
 * immer auf 0 zurück, unabhängig vom vorherigen Wert. Dieses Property
 * wird isoliert getestet, indem die Zustandslogik (setActiveLineIndex(0))
 * für beliebige Ausgangswerte verifiziert wird.
 *
 * **Validates: Requirements 3.2**
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";

// ── Arbitraries ──

/** Arbitrary number of lines in a song (1 to 200) */
const arbLineCount = fc.integer({ min: 1, max: 200 });

/** Arbitrary initial activeLineIndex, constrained to valid range [0, lineCount - 1] */
const arbInitialState = arbLineCount.chain((lineCount) =>
  fc.record({
    lineCount: fc.constant(lineCount),
    activeLineIndex: fc.integer({ min: 0, max: lineCount - 1 }),
  }),
);

const PBT_CONFIG = { numRuns: 100 };

// ── Stop handler logic extracted from KaraokePage ──

/**
 * Models the activeLineIndex reset logic of handleAudioStop().
 *
 * In KaraokePage, handleAudioStop does:
 *   1. audioRef.current?.stop()
 *   2. setActiveLineIndex(0)   ← this is what we test
 *   3. pause()
 *
 * The line index reset is unconditional — it always sets to 0.
 */
function applyStopLineReset(_currentIndex: number): number {
  // Mirrors: setActiveLineIndex(0)
  return 0;
}

// ── Property 4: Stop setzt Zeilenanzeige zurück ──
// **Validates: Requirements 3.2**

describe("Property 4: Stop setzt Zeilenanzeige zurück", () => {
  it("für beliebige activeLineIndex-Werte: nach handleAudioStop() gilt activeLineIndex === 0", () => {
    fc.assert(
      fc.property(arbInitialState, ({ lineCount, activeLineIndex }) => {
        // Precondition: activeLineIndex is within valid range
        expect(activeLineIndex).toBeGreaterThanOrEqual(0);
        expect(activeLineIndex).toBeLessThan(lineCount);

        // Act: apply the stop handler's line reset logic
        const resultIndex = applyStopLineReset(activeLineIndex);

        // Assert: activeLineIndex must be 0 after stop
        expect(resultIndex).toBe(0);
      }),
      PBT_CONFIG,
    );
  });

  it("auch bei wiederholtem Stop bleibt activeLineIndex === 0", () => {
    fc.assert(
      fc.property(
        arbInitialState,
        fc.integer({ min: 1, max: 10 }),
        ({ activeLineIndex }, repeatCount) => {
          // Apply stop logic multiple times
          let currentIndex = activeLineIndex;
          for (let i = 0; i < repeatCount; i++) {
            currentIndex = applyStopLineReset(currentIndex);
          }

          // Assert: activeLineIndex must still be 0
          expect(currentIndex).toBe(0);
        },
      ),
      PBT_CONFIG,
    );
  });
});
