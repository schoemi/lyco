/**
 * @vitest-environment jsdom
 */

/**
 * Property-Test: Stop deaktiviert Auto-Scroll
 *
 * Property 5: Stop deaktiviert Auto-Scroll
 *   ∀ Zustand s: nach handleAudioStop() gilt isAutoScrolling === false
 *
 * In handleAudioStop() wird pause() aus useAutoScroll aufgerufen,
 * um den Auto-Scroll zu deaktivieren. Dieses Property verifiziert,
 * dass nach pause() isPlaying immer false ist, unabhängig vom
 * Ausgangszustand (playing/paused, beliebige Geschwindigkeit).
 *
 * **Validates: Requirements 3.3**
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import fc from "fast-check";
import { renderHook, act, cleanup } from "@testing-library/react";
import { useAutoScroll } from "@/lib/karaoke/use-auto-scroll";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// ── Arbitraries ──

/** Arbitrary scroll speed in seconds per line (0.5 to 10) */
const arbSpeed = fc.double({ min: 0.5, max: 10, noNaN: true, noDefaultInfinity: true });

/** Arbitrary initial playing state */
const arbInitiallyPlaying = fc.boolean();

const PBT_CONFIG = { numRuns: 100 };

// ── Property 5: Stop deaktiviert Auto-Scroll ──
// **Validates: Requirements 3.3**

describe("Property 5: Stop deaktiviert Auto-Scroll", () => {
  it("für beliebige Ausgangszustände: nach pause() gilt isPlaying === false", () => {
    fc.assert(
      fc.property(arbSpeed, arbInitiallyPlaying, (speed, initiallyPlaying) => {
        cleanup();

        const onAdvance = vi.fn();

        const { result } = renderHook(() =>
          useAutoScroll({
            speed,
            isLastLine: false,
            onAdvance,
          }),
        );

        // Set up initial state: if initiallyPlaying, call play() first
        if (initiallyPlaying) {
          act(() => {
            result.current.play();
          });
          expect(result.current.isPlaying).toBe(true);
        }

        // Act: call pause() — this is what handleAudioStop() does
        act(() => {
          result.current.pause();
        });

        // Assert: isPlaying must be false after pause
        expect(result.current.isPlaying).toBe(false);
      }),
      PBT_CONFIG,
    );
  });

  it("auch bei beliebiger Geschwindigkeit: nach pause() ist Auto-Scroll deaktiviert", () => {
    fc.assert(
      fc.property(arbSpeed, (speed) => {
        cleanup();

        const onAdvance = vi.fn();

        const { result } = renderHook(() =>
          useAutoScroll({
            speed,
            isLastLine: false,
            onAdvance,
          }),
        );

        // Start playing, then pause
        act(() => {
          result.current.play();
        });
        expect(result.current.isPlaying).toBe(true);

        act(() => {
          result.current.pause();
        });

        // Assert: isPlaying must be false
        expect(result.current.isPlaying).toBe(false);
      }),
      PBT_CONFIG,
    );
  });
});
