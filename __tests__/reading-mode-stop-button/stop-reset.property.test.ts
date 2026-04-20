/**
 * @vitest-environment jsdom
 */

/**
 * Property-Tests: Stop setzt Position zurück und pausiert Wiedergabe
 *
 * Property 1: Stop setzt Position zurück
 *   ∀ Zustand s: nach stop() gilt audio.currentTime === 0
 *
 * Property 2: Stop pausiert Wiedergabe
 *   ∀ Zustand s: nach stop() gilt audio.paused === true
 *
 * Für beliebige Ausgangszustände (playing/paused, beliebige currentTime)
 * gilt nach stop(): audio.paused === true && audio.currentTime === 0
 *
 * **Validates: Requirements 2.2, 2.3, 5.1, 5.2**
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

// ── Arbitraries ──

/** Arbitrary currentTime in seconds (0 to 600s = 10 minutes) */
const arbCurrentTime = fc.double({ min: 0, max: 600, noNaN: true, noDefaultInfinity: true });

/** Arbitrary initial paused state */
const arbPaused = fc.boolean();

const PBT_CONFIG = { numRuns: 100 };

// ── Property 1: Stop setzt Position zurück ──
// **Validates: Requirements 2.2, 2.3, 5.1, 5.2**

describe("Property 1: Stop setzt Position zurück", () => {
  it("für beliebige Ausgangszustände (beliebige currentTime): nach stop() gilt audio.currentTime === 0", () => {
    fc.assert(
      fc.property(arbCurrentTime, arbPaused, (initialTime, initialPaused) => {
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

        // Get the rendered audio element and set initial state
        const audioEl = container.querySelector("audio") as HTMLAudioElement;
        expect(audioEl).not.toBeNull();

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

        // Act: call stop()
        expect(ref.current).not.toBeNull();
        ref.current!.stop();

        // Assert: currentTime must be 0
        expect(audioEl.currentTime).toBe(0);
      }),
      PBT_CONFIG,
    );
  });
});

// ── Property 2: Stop pausiert Wiedergabe ──
// **Validates: Requirements 2.2, 2.3, 5.1, 5.2**

describe("Property 2: Stop pausiert Wiedergabe", () => {
  it("für beliebige Ausgangszustände (playing/paused): nach stop() gilt audio.paused === true", () => {
    fc.assert(
      fc.property(arbCurrentTime, arbPaused, (initialTime, initialPaused) => {
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

        // Get the rendered audio element and set initial state
        const audioEl = container.querySelector("audio") as HTMLAudioElement;
        expect(audioEl).not.toBeNull();

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

        // Act: call stop()
        expect(ref.current).not.toBeNull();
        ref.current!.stop();

        // Assert: audio must be paused
        expect(audioEl.paused).toBe(true);
      }),
      PBT_CONFIG,
    );
  });
});
