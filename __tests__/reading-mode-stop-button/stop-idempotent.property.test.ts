/**
 * @vitest-environment jsdom
 */

/**
 * Property-Test: Stop ist idempotent
 *
 * Property 3: Stop ist idempotent
 *   Mehrfaches Aufrufen von stop() hat denselben Effekt wie einmaliges Aufrufen.
 *   ∀ Zustand s, ∀ n ≥ 1: stop()^n ≡ stop()^1
 *
 * Für beliebige Ausgangszustände (playing/paused, beliebige currentTime)
 * und beliebige Anzahl zusätzlicher stop()-Aufrufe gilt:
 *   Der Zustand nach N+1 Aufrufen ist identisch zum Zustand nach 1 Aufruf.
 *
 * **Validates: Requirements 5.1, 5.2, 5.3**
 */

import { describe, it, expect, afterEach } from "vitest";
import fc from "fast-check";
import React from "react";
import { render, cleanup } from "@testing-library/react";
import { AudioPlayButton } from "@/components/karaoke/audio-play-button";
import type { AudioPlayButtonHandle } from "@/components/karaoke/audio-play-button";
import type { AudioQuelleResponse } from "@/types/audio";

afterEach(() => {
  cleanup();
});

// ── Helpers ──

function makeMp3Quelle(): AudioQuelleResponse {
  return {
    id: "test-mp3",
    url: "https://example.com/song.mp3",
    typ: "MP3",
    label: "Test MP3",
    orderIndex: 0,
    rolle: "STANDARD",
  };
}

function setupAudioElement(
  container: HTMLElement,
  initialTime: number,
  initialPaused: boolean,
): HTMLAudioElement {
  const audioEl = container.querySelector("audio") as HTMLAudioElement;

  // Set arbitrary initial currentTime
  audioEl.currentTime = initialTime;

  // Simulate initial playing state by stubbing paused
  if (!initialPaused) {
    Object.defineProperty(audioEl, "paused", {
      value: false,
      writable: true,
      configurable: true,
    });
    // Stub pause() to set paused back to true (jsdom doesn't do this)
    audioEl.pause = () => {
      Object.defineProperty(audioEl, "paused", {
        value: true,
        writable: true,
        configurable: true,
      });
    };
  }

  return audioEl;
}

// ── Arbitraries ──

/** Arbitrary currentTime in seconds (0 to 600s = 10 minutes) */
const arbCurrentTime = fc.double({ min: 0, max: 600, noNaN: true, noDefaultInfinity: true });

/** Arbitrary initial paused state */
const arbPaused = fc.boolean();

/** Arbitrary number of additional stop() calls (1 to 10) */
const arbExtraCalls = fc.integer({ min: 1, max: 10 });

const PBT_CONFIG = { numRuns: 100 };

// ── Property 3: Stop ist idempotent ──
// **Validates: Requirements 5.1, 5.2, 5.3**

describe("Property 3: Stop ist idempotent", () => {
  it("mehrfaches Aufrufen von stop() hat denselben Effekt wie einmaliges Aufrufen", () => {
    fc.assert(
      fc.property(
        arbCurrentTime,
        arbPaused,
        arbExtraCalls,
        (initialTime, initialPaused, extraCalls) => {
          cleanup();

          const ref = React.createRef<AudioPlayButtonHandle>();
          const quelle = makeMp3Quelle();

          const { container } = render(
            React.createElement(AudioPlayButton, {
              ref,
              audioQuellen: [quelle],
              activeQuelleId: null,
            }),
          );

          const audioEl = setupAudioElement(container, initialTime, initialPaused);

          expect(ref.current).not.toBeNull();

          // Act: call stop() once and record state
          ref.current!.stop();

          const stateAfterFirstStop = {
            paused: audioEl.paused,
            currentTime: audioEl.currentTime,
          };

          // Act: call stop() N more times
          for (let i = 0; i < extraCalls; i++) {
            ref.current!.stop();
          }

          const stateAfterMultipleStops = {
            paused: audioEl.paused,
            currentTime: audioEl.currentTime,
          };

          // Assert: state after multiple calls is identical to state after single call
          expect(stateAfterMultipleStops.paused).toBe(stateAfterFirstStop.paused);
          expect(stateAfterMultipleStops.currentTime).toBe(stateAfterFirstStop.currentTime);

          // Also verify the expected final state
          expect(stateAfterMultipleStops.paused).toBe(true);
          expect(stateAfterMultipleStops.currentTime).toBe(0);
        },
      ),
      PBT_CONFIG,
    );
  });
});
